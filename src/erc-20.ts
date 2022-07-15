import SwapMulticall from "./swap-multicall";
import { Contract } from "@ethersproject/contracts";
import SwapContract from "./swap-contract";
import { CurrencyAmount, ETHER, Token, TokenAmount } from "./@uniswap/sdk";
import BigNumber from "bignumber.js";

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED
}
export default class ERC20 {
  private contract: Contract | null;
  private account: string;
  public swapMulticall: SwapMulticall;
  private token: Token;

  constructor(account: string, token: Token, multicall: SwapMulticall, swapContract: SwapContract) {
    this.swapMulticall = multicall;
    this.account = account;
    this.token = token;
    this.contract = swapContract.useTokenContract(token.address, true);
  }

  public async allowance(owner: string, erc20: string): Promise<TokenAmount | undefined> {
    const contract = this.swapMulticall.swapContract.useTokenContract(this.token?.address, false);
    const inputs = [owner, erc20];
    const res = await this.swapMulticall.useSingleCallResult(contract, "allowance", inputs);
    const allowance = res.result;
    return this.token && allowance ? new TokenAmount(this.token, allowance.toString()) : undefined;
  }

  public getApprovalState(amount: CurrencyAmount, allowance: CurrencyAmount): ApprovalState {
    if (amount.currency === ETHER) return ApprovalState.APPROVED;
    if (!allowance) return ApprovalState.UNKNOWN;
    return allowance.lessThan(amount) ? ApprovalState.NOT_APPROVED : ApprovalState.APPROVED;
  }

  public async decimals(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "decimals");
    return res?.result?.[0].toString();
  }

  public async totalSupply(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "totalSupply");
    const decimals = await this.decimals();
    const value = res?.result?.[0].toString();
    return new BigNumber(value).div(new BigNumber(10).exponentiatedBy(decimals)).toString();
  }

  /**
   * 授权操作
   *
   * @param {string} spender 授权地址
   * @param {string} amount 授权数量
   * @returns
   * @memberof ERC20
   */
  public async approve(spender: string, amount: string) {
    const result = await this.contract?.approve(spender, amount, {
      from: this.account
    });
    return result;
  }

  /**
   * 转账
   *
   * @param {string} to 地址
   * @param {string} amount 授权数量
   * @returns
   * @memberof ERC20
   */
  public async transfer(to: string, amount: string) {
    const result = await this.contract?.transfer(to, amount, {
      from: this.account
    });
    return result;
  }

  /**
   * 增加授权额度
   *
   * @param {string} to 被授权地址
   * @param {string} amount 增加的授权数量
   * @memberof ERC20
   */
  public async increaseAllowance(to: string, amount: string) {
    const result = await this.contract?.increaseAllowance(to, amount, {
      from: this.account
    });
    return result;
  }

  /**
   * 减少授权额度
   *
   * @param {string} to 被授权地址
   * @param {string} amount 减少的授权额度
   * @memberof ERC20
   */
  public async decreaseAllowance(to: string, amount: string) {
    const result = await this.contract?.decreaseAllowance(to, amount, {
      from: this.account
    });
    return result;
  }
}
