import SwapMulticall from "./swap-multicall";
import SwapContract from "./swap-contract";
import SwapBalance from "./swap-balance";
import { Contract } from "@ethersproject/contracts";

import { Web3Provider } from "@ethersproject/providers";
import { normalizeAccount } from "./utils/normalizers";
import Web3 from "web3";
import { toWei } from "web3-utils";
import { Token721 } from "./@uniswap/sdk";
import ERC721 from "./erc-721";
import BigNumber from "bignumber.js";
import NFT_CC_DAO from "./abis/nftccdao.json";

export interface NFTDaoParameters {
  chainId: number;
  account: string;
  web3: Web3;
  multicallAddress: string;
  // nft dao合约地址
  nftDaoContract: string;
}

export default class NFTDao {
  public swapMulticall: SwapMulticall;
  public swapContract: SwapContract;
  public nftDaoContract: Contract | null;
  public swapBalance: SwapBalance;
  private account: string;

  constructor(options: NFTDaoParameters) {
    const { web3, chainId, multicallAddress, nftDaoContract } = options;
    const account = normalizeAccount(options.account);
    this.account = account;
    const currentProvider: any = web3.currentProvider;
    const library: Web3Provider = new Web3Provider(currentProvider, chainId);
    this.swapContract = new SwapContract(account, multicallAddress, library);
    this.swapMulticall = new SwapMulticall(chainId, web3, this.swapContract);
    this.swapBalance = new SwapBalance(this.swapMulticall);
    this.nftDaoContract = this.swapContract.useContract(nftDaoContract, NFT_CC_DAO, true);
  }

  /**
   * 初始化721合约
   *
   * @param {string} token Token721
   * @returns {ERC721}
   * @memberof NFTDao
   */
  public initERC721(token: Token721): ERC721 {
    return new ERC721(this.account, token, this.swapMulticall, this.swapContract);
  }

  /**
   * 获取CHA合约经营权地址
   *
   * @returns {Promise<string>}
   * @memberof ChaSwap
   */
  public async admin(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.nftDaoContract, "admin");
    return res?.result?.[0];
  }
  /**
   * 获取CHA合约所有权地址
   *
   * @returns {Promise<string>}
   * @memberof ChaSwap
   */
  public async owner(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.nftDaoContract, "owner");
    return res?.result?.[0];
  }

  /**
   * 放弃合约所有权
   *
   * @returns
   * @memberof ChaSwap
   */
  public async renounceOwnership() {
    const result = await this.nftDaoContract?.renounceOwnership({
      from: this.account
    });
    return result;
  }

  /**
   * 转移合约经营权
   *
   * @param {string} newAdmin
   * @returns
   * @memberof ChaSwap
   */
  public async transferAdministrator(newAdmin: string) {
    const result = await this.nftDaoContract?.transferAdministrator(newAdmin, {
      from: this.account
    });
    return result;
  }

  /**
   * 转移合约所有权
   *
   * @param {string} newOwner
   * @returns
   * @memberof ChaSwap
   */
  public async transferOwnership(newOwner: string) {
    const result = await this.nftDaoContract?.transferOwnership(newOwner, {
      from: this.account
    });
    return result;
  }

  public withdrawHistory() {}

  public onERC721Received() {}

  /**
   * 设置手续费
   *
   * @param {number} fee
   * @returns
   * @memberof ChaSwap
   */
  public async setFee(fee: number) {
    const result = await this.nftDaoContract?.setFee(toWei(new BigNumber(fee).toString()), {
      from: this.account
    });
    return result;
  }

  public withdrawFee() {}

  /**
     * 
     * 充币
     * 
     * 从以太坊到井通
     * 
     * @param {string} nft nft合约地址
     * @param {number} id nft id
     * @param {string} jtaddress 井通地址
        * @param {number} [fee=0] 手续费，默认为0

     * @returns {Promise<number>}
     * @memberof NFTDao
     */
  public async deposit(nft: string, id: number, jtaddress: string, fee = 0) {
    const result = await this.nftDaoContract?.deposit(nft, id, jtaddress, {
      value: toWei(new BigNumber(fee).toString()),
      from: this.account
    });
    return result;
  }

  /**
   * 提币
   *
   * 从井通到以太坊
   *
   * @param {string} nft nft合约地址
   * @param {string} to 目的地，以太坊地址
   * @param {number} id nft id
   * @param {string} jthash 井通hash
   * @returns {Promise<number>}
   * @memberof NFTDao
   */
  public async withdraw(nft: string, to: string, id: number, jthash: string) {
    const result = await this.nftDaoContract?.withdraw(nft, to, id, jthash, {
      from: this.account
    });
    return result;
  }
}
