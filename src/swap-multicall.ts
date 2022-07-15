import { Interface, FunctionFragment } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import Web3 from "web3";
import SwapContract from "./swap-contract";

export interface Result extends ReadonlyArray<any> {
  readonly [key: string]: any;
}

interface Call {
  address: string;
  callData: string;
}

function parseCallKey(callKey: string): Call {
  const pcs = callKey.split("-");
  if (pcs.length !== 2) {
    throw new Error(`Invalid call key: ${callKey}`);
  }
  return {
    address: pcs[0],
    callData: pcs[1]
  };
}

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const LOWER_HEX_REGEX = /^0x[a-f0-9]*$/;
function toCallKey(call: Call): string {
  if (!ADDRESS_REGEX.test(call.address)) {
    throw new Error(`Invalid address: ${call.address}`);
  }
  if (!LOWER_HEX_REGEX.test(call.callData)) {
    throw new Error(`Invalid hex: ${call.callData}`);
  }
  return `${call.address}-${call.callData}`;
}

interface ListenerOptions {
  // how often this data should be fetched, by default 1
  readonly blocksPerFetch?: number;
}

type MethodArg = string | number | BigNumber;
type MethodArgs = Array<MethodArg | MethodArg[]>;

type OptionalMethodInputs = Array<MethodArg | MethodArg[] | undefined> | undefined;

function isMethodArg(x: unknown): x is MethodArg {
  return ["string", "number"].indexOf(typeof x) !== -1;
}

function isValidMethodArgs(x: unknown): x is MethodArgs | undefined {
  return (
    x === undefined ||
    (Array.isArray(x) && x.every((xi) => isMethodArg(xi) || (Array.isArray(xi) && xi.every(isMethodArg))))
  );
}

interface CallResult {
  readonly valid: boolean;
  readonly data: string | undefined;
  readonly blockNumber: number | undefined;
}

const INVALID_RESULT: CallResult = { valid: false, blockNumber: undefined, data: undefined };

// use this options object
export const NEVER_RELOAD: ListenerOptions = {
  blocksPerFetch: Infinity
};

export interface CallState {
  readonly valid: boolean;
  // the result, or undefined if loading or errored/no data
  readonly result: Result | undefined;
  // true if the result has never been fetched
  readonly loading: boolean;
  // true if the result is not for the latest block
  readonly syncing: boolean;
  // true if the call was made and is synced, but the return data is invalid
  readonly error: boolean;
}

const INVALID_CALL_STATE: CallState = { valid: false, result: undefined, loading: false, syncing: false, error: false };
const LOADING_CALL_STATE: CallState = { valid: true, result: undefined, loading: true, syncing: true, error: false };

function toCallState(
  callResult: CallResult | undefined,
  contractInterface: Interface | undefined,
  fragment: FunctionFragment | undefined,
  latestBlockNumber: number | undefined
): CallState {
  if (!callResult) return INVALID_CALL_STATE;
  const { valid, data, blockNumber } = callResult;
  if (!valid) return INVALID_CALL_STATE;
  if (valid && !blockNumber) return LOADING_CALL_STATE;

  if (!contractInterface || !fragment || !latestBlockNumber) return LOADING_CALL_STATE;
  const success = data && data.length > 2;
  const syncing = (blockNumber ?? 0) < latestBlockNumber;
  let result: Result | undefined = undefined;
  if (success && data) {
    try {
      result = contractInterface.decodeFunctionResult(fragment, data);
    } catch (error) {
      console.debug("Result data parsing failed", fragment, data);
      return {
        valid: true,
        loading: false,
        error: true,
        syncing,
        result
      };
    }
  }
  return {
    valid: true,
    loading: false,
    syncing,
    result: result,
    error: !success
  };
}

export default class SwapMulticall {
  public readonly swapContract: SwapContract;
  public readonly chainId: number;
  private web3: Web3;

  constructor(chainId: number, web3: Web3, swapContract: SwapContract) {
    this.chainId = chainId;
    this.web3 = new Web3(web3.currentProvider);
    this.swapContract = swapContract;
  }

  public async useBlockNumber(): Promise<number> {
    const block = await this.web3.eth.getBlockNumber();
    return block - 10;
  }

  public async fetchChunk(chunk: Call[], minBlockNumber: number): Promise<{ results: string[]; blockNumber: number }> {
    let resultsBlockNumber, returnData;
    const multicallContract = this.swapContract.useMulticallContract();

    try {
      [resultsBlockNumber, returnData] = await multicallContract?.aggregate(
        chunk.map((obj) => [obj.address, obj.callData])
      );
    } catch (error) {
      console.debug("Failed to fetch chunk inside retry", error);
      throw error;
    }
    if (resultsBlockNumber.toNumber() < minBlockNumber) {
      console.debug(`Fetched results for old block number: ${resultsBlockNumber.toString()} vs. ${minBlockNumber}`);
      throw new Error("Fetched for old block number");
    }

    return { results: returnData, blockNumber: resultsBlockNumber.toNumber() };
  }

  // the lowest level call for subscribing to contract data
  public async useCallsData(calls: (Call | undefined)[]): Promise<CallResult[] | undefined> {
    const chainId = this.chainId;
    // not need sort serialized keys
    const serializedCallKeys: string = JSON.stringify(
      calls?.filter((c): c is Call => Boolean(c))?.map(toCallKey) ?? []
    );

    const callKeys: string[] = JSON.parse(serializedCallKeys);
    if (!chainId || callKeys.length === 0) return undefined;
    calls = callKeys.map((key) => parseCallKey(key));

    // @ts-ignore
    const res = await this.fetchChunk(calls, await this.useBlockNumber());

    const returnData = res.results;

    const callResults = {
      chainId,
      results: callKeys.reduce<{ [callKey: string]: string | null }>((memo, callKey, i) => {
        memo[callKey] = returnData[i] ?? null;
        return memo;
      }, {}),
      blockNumber: res.blockNumber
    };

    return calls.map<CallResult>((call) => {
      if (!chainId || !call) return INVALID_RESULT;

      const results = callResults.results;
      const result: string | null = results[toCallKey(call)];
      let data;
      if (result && result !== "0x") {
        data = result;
      }
      return { valid: true, data, blockNumber: callResults?.blockNumber };
    });
  }

  public async useSingleContractMultipleData(
    contract: Contract | null | undefined,
    methodName: string,
    callInputs: OptionalMethodInputs[]
  ): Promise<CallState[]> {
    const fragment = contract?.interface?.getFunction(methodName);

    const calls =
      contract && fragment && callInputs && callInputs.length > 0
        ? callInputs.map<Call>((inputs) => {
            return {
              address: contract.address,
              callData: contract.interface.encodeFunctionData(fragment, inputs)
            };
          })
        : [];

    const results = await this.useCallsData(calls);

    const latestBlockNumber = await this.useBlockNumber();

    // @ts-ignore
    return results.map((result) => toCallState(result, contract?.interface, fragment, latestBlockNumber));
  }

  public async useMultipleContractSingleData(
    addresses: (string | undefined)[],
    contractInterface: Interface,
    methodName: string,
    callInputs?: OptionalMethodInputs
  ): Promise<CallState[] | undefined> {
    const fragment = contractInterface.getFunction(methodName);
    const callData: string | undefined =
      fragment && isValidMethodArgs(callInputs)
        ? contractInterface.encodeFunctionData(fragment, callInputs)
        : undefined;

    const calls =
      fragment && addresses && addresses.length > 0 && callData
        ? addresses.map<Call | undefined>((address) => {
            return address && callData
              ? {
                  address,
                  callData
                }
              : undefined;
          })
        : [];

    const results = await this.useCallsData(calls);

    const latestBlockNumber = await this.useBlockNumber();

    return results && results.map((result) => toCallState(result, contractInterface, fragment, latestBlockNumber));
  }

  public async useSingleCallResult(
    contract: Contract | null | undefined,
    methodName: string,
    inputs?: OptionalMethodInputs
  ): Promise<CallState> {
    const fragment = contract?.interface?.getFunction(methodName);

    const calls =
      contract && fragment && isValidMethodArgs(inputs)
        ? [
            {
              address: contract.address,
              callData: contract.interface.encodeFunctionData(fragment, inputs)
            }
          ]
        : [];

    const callResults = await this.useCallsData(calls);
    const latestBlockNumber = await this.useBlockNumber();

    // @ts-ignore
    return toCallState(callResults[0], contract?.interface, fragment, latestBlockNumber);
  }
}
