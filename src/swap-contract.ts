import { Contract } from "@ethersproject/contracts";
import { getContract } from "./utils";
import ERC20_ABI from "./abis/erc20.json";
import MULTICALL_ABI from "./abis/multicall.json";

export default class SwapContract {
  private library: any;
  private account: string;
  private multicallAddress: string;
  constructor(account: string, multicall: string, library: any) {
    this.library = library;
    this.account = account;
    this.multicallAddress = multicall;
  }

  public useContract(address: string | undefined, ABI: any, withSignerIfPossible = true): Contract | null {
    const library = this.library;
    const account = this.account;

    if (!address || !ABI || !library) return null;
    try {
      return getContract(address, ABI, library, withSignerIfPossible && account ? account : undefined);
    } catch (error) {
      console.error("Failed to get contract", error);
      return null;
    }
  }

  public useTokenContract(tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
    return this.useContract(tokenAddress, ERC20_ABI, withSignerIfPossible);
  }

  public useMulticallContract(): Contract | null {
    return this.useContract(this.multicallAddress, MULTICALL_ABI, false);
  }
}
