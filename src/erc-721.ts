import SwapMulticall, { CallState } from "./swap-multicall";
import { Contract } from "@ethersproject/contracts";
import SwapContract from "./swap-contract";
import { Token721 } from "./@uniswap/sdk";
import ERC_721 from "./abis/erc721.json";

interface TokenIdOwner {
  token: Token721;
  owner: string;
  tokenId: number;
}

export default class ERC721 {
  private contract: Contract | null;
  private account: string;
  public swapMulticall: SwapMulticall;
  private token721: Token721;

  constructor(account: string, token721: Token721, multicall: SwapMulticall, swapContract: SwapContract) {
    this.swapMulticall = multicall;
    this.account = account;
    this.token721 = token721;
    this.contract = swapContract.useContract(token721.address, ERC_721, true);
  }

  /**
   * 获取指定钱包地址所有该721通证
   *
   * @param {string} owner 钱包地址
   * @param {number} total 该钱包地址拥有的总数
   * @returns {Promise<TokenIdOwner[]>}
   * @memberof ERC721
   */
  public async allTokensOfOwner(owner: string, total: number): Promise<TokenIdOwner[]> {
    // @ts-ignore
    const indexs = Array.from({ length: total }, (v, i) => [owner, i]);
    const results = await this.swapMulticall.useSingleContractMultipleData(
      this.contract,
      "tokenOfOwnerByIndex",
      indexs
    );
    const tokenIds = results
      .filter((result) => result.valid && result.result?.length === 1)
      .map((result) => result.result && result.result[0].toNumber());
    return tokenIds.map((id) => {
      return {
        token: this.token721,
        owner,
        tokenId: id
      };
    });
  }

  /**
   * 获取所有该721通证
   *
   * @param {number} total 该721通证发行量
   * @returns {Promise<TokenIdOwner[]>}
   * @memberof ERC721
   */
  public async allTokens(total: number): Promise<TokenIdOwner[]> {
    // @ts-ignore
    const indexs = Array.from({ length: total }, (v, i) => [i]);
    const results = await this.swapMulticall.useSingleContractMultipleData(this.contract, "tokenByIndex", indexs);
    const tokenIds = results
      .filter((result) => result.valid && result.result?.length === 1)
      .map((result) => result.result && result.result[0].toNumber());
    // @ts-ignore
    const inputs = Array.from({ length: tokenIds.length }, (v, i) => [tokenIds[i]]);
    const ownerResults = await this.swapMulticall.useSingleContractMultipleData(this.contract, "ownerOf", inputs);
    const owners = ownerResults
      .filter((result) => result.valid && result.result?.length === 1)
      .map((result) => result.result && result.result[0]);
    return owners.map((owner, i) => {
      return {
        tokenId: tokenIds[i],
        owner,
        token: this.token721
      };
    });
  }

  public async admin(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "admin");
    return res?.result?.[0];
  }

  public async approve(to: string, tokenId: number) {
    const result = await this.contract?.approve(to, tokenId, {
      from: this.account
    });
    return result;
  }

  /**
   * 获取指定钱包地址721拥有总数
   *
   * @param {string} owner
   * @returns {Promise<number>}
   * @memberof ERC721
   */
  public async balanceOf(owner: string): Promise<number> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "balanceOf", [owner]);
    return res?.result?.[0].toNumber();
  }

  /**
   * 判断tokenId是否授权
   *
   * @param {number} tokenId
   * @param {string} contract 合约地址
   * @returns {Promise<boolean>}
   * @memberof ERC721
   */
  public async isApproved(tokenId: number, contract: string): Promise<boolean> {
    const approved = await this.getApproved(tokenId);
    return approved?.toLowerCase() === contract.toLowerCase();
  }

  /**
   * 获取授权地址
   *
   * @param {number} tokenId
   * @returns {Promise<string>}
   * @memberof ERC721
   */
  public async getApproved(tokenId: number): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "getApproved", [tokenId]);
    return res?.result?.[0];
  }

  public async isApprovedForAll(owner: string, operator: string): Promise<boolean> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "isApprovedForAll", [owner, operator]);
    return res?.result?.[0];
  }

  public async name(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "name");
    return res?.result?.[0];
  }

  public async owner(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "owner");
    return res?.result?.[0];
  }

  public async ownerOf(tokenId: number): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "ownerOf", [tokenId]);
    return res?.result?.[0];
  }

  public async renounceOwnership() {
    const result = await this.contract?.renounceOwnership({
      from: this.account
    });
    return result;
  }

  public async safeTransferFrom(from: string, to: string, tokenId: number) {
    const result = await this.contract?.["safeTransferFrom(address,address,uint256)"](from, to, tokenId, {
      from: this.account
    });
    return result;
  }

  public async safeTransferFromWithData(from: string, to: string, tokenId: number, data: string) {
    const result = await this.contract?.["safeTransferFrom(address,address,uint256,bytes)"](from, to, tokenId, data, {
      from: this.account
    });
    return result;
  }

  public async setApprovalForAll(operator: string, approved: boolean) {
    const result = await this.contract?.setApprovalForAll(operator, approved, {
      from: this.account
    });
    return result;
  }

  public async supportsInterface(interfaceId: number): Promise<CallState> {
    return await this.swapMulticall.useSingleCallResult(this.contract, "supportsInterface", [interfaceId]);
  }

  public async symbol(): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "symbol");
    return res?.result?.[0];
  }

  /**
   * 根据index获取tokenId
   *
   * @param {number} index
   * @returns {Promise<number>} token id
   * @memberof ERC721
   */
  public async tokenByIndex(index: number): Promise<number> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "tokenByIndex", [index]);
    return res?.result?.[0].toNumber();
  }

  /**
   * 根据指定钱包地址index获取tokenId
   *
   * @param {number} index
   * @returns {Promise<number>} token id
   * @memberof ERC721
   */
  public async tokenOfOwnerByIndex(owner: string, index: number): Promise<number> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "tokenOfOwnerByIndex", [owner, index]);
    return res?.result?.[0].toNumber();
  }

  public async tokenURI(tokenId: number): Promise<string> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "tokenURI", [tokenId]);
    return res?.result?.[0];
  }

  public async totalSupply(): Promise<number> {
    const res = await this.swapMulticall.useSingleCallResult(this.contract, "totalSupply");
    const result = res.result;
    return result?.[0].toNumber();
  }

  public async transferAdministrator(newAdmin: string) {
    const result = await this.contract?.transferAdministrator(newAdmin, {
      from: this.account
    });
    return result;
  }

  public async transferFrom(from: string, to: string, tokenId: number) {
    const result = await this.contract?.transferFrom(from, to, tokenId, {
      from: this.account
    });
    return result;
  }

  public async transferOwnership(newOwner: string) {
    const result = await this.contract?.transferOwnership(newOwner, {
      from: this.account
    });
    return result;
  }

  /**
   * 铸币
   * onlyOwner
   *
   * @param {string} receiver
   * @param {number} tokenId
   * @returns
   * @memberof ERC721
   */
  public async mint(receiver: string, tokenId: number) {
    const result = await this.contract?.mint(tokenId, receiver, {
      from: this.account
    });
    return result;
  }

  public async burn(tokenId: number) {
    const result = await this.contract?.burn(tokenId, {
      from: this.account
    });
    return result;
  }

  public async reBaseUri(uri: string) {
    const result = await this.contract?.reBaseUri(uri, {
      from: this.account
    });
    return result;
  }
}
