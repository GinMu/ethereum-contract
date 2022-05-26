import { TokenAmount, Pair, Currency } from "./@uniswap/sdk";
import { abi as IUniswapV2PairABI } from "@uniswap/v2-core/build/IUniswapV2Pair.json";
import { Interface } from "@ethersproject/abi";
import { wrappedCurrency } from "./utils/wrappedCurrency";
import SwapMulticall from "./swap-multicall";

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI);

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID
}

export default class SwapReserves {
  private swapMulticall: SwapMulticall;
  private chainId: number;
  private factoryAddress: string;
  private initCodeHash: string;

  constructor(factoryAddress: string, initCodeHash: string, swapMulticall: SwapMulticall) {
    this.swapMulticall = swapMulticall;
    this.factoryAddress = factoryAddress;
    this.initCodeHash = initCodeHash;
    this.chainId = swapMulticall.chainId;
  }

  public async usePairs(
    currencies: [Currency | undefined, Currency | undefined][]
  ): Promise<[PairState, Pair | null][] | undefined> {
    const chainId = this.chainId;

    const tokens = currencies.map(([currencyA, currencyB]) => [
      wrappedCurrency(currencyA, chainId),
      wrappedCurrency(currencyB, chainId)
    ]);

    const pairAddresses = tokens.map(([tokenA, tokenB]) => {
      return tokenA && tokenB && !tokenA.equals(tokenB)
        ? Pair.getAddress(tokenA, tokenB, this.factoryAddress, this.initCodeHash)
        : undefined;
    });

    const results = await this.swapMulticall.useMultipleContractSingleData(
      pairAddresses,
      PAIR_INTERFACE,
      "getReserves"
    );

    return results?.map((result, i) => {
      const { result: reserves, loading } = result;
      const tokenA = tokens[i][0];
      const tokenB = tokens[i][1];

      if (loading) return [PairState.LOADING, null];
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null];
      if (!reserves) return [PairState.NOT_EXISTS, null];
      const { reserve0, reserve1 } = reserves;
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
      return [
        PairState.EXISTS,
        new Pair(
          new TokenAmount(token0, reserve0.toString()),
          new TokenAmount(token1, reserve1.toString()),
          this.factoryAddress,
          this.initCodeHash
        )
      ];
    });
  }

  public async usePair(tokenA?: Currency, tokenB?: Currency): Promise<[PairState, Pair | null] | undefined> {
    const pairs = await this.usePairs([[tokenA, tokenB]]);
    return pairs?.[0];
  }
}
