import { Currency, CurrencyAmount, ETHER, JSBI, Token, TokenAmount } from "./@uniswap/sdk";
import ERC20_ABI from "./abis/erc20.json";
import { isAddress } from "./utils";
import SwapMulticall from "./swap-multicall";
import { Interface } from "@ethersproject/abi";
const ERC20_INTERFACE = new Interface(ERC20_ABI);

export default class SwapBalance {
  private swapMulticall: SwapMulticall;

  constructor(swapMulticall: SwapMulticall) {
    this.swapMulticall = swapMulticall;
  }
  /**
   * Returns a map of the given addresses to their eventually consistent ETH balances.
   */
  public async useETHBalances(
    uncheckedAddresses?: (string | undefined)[]
  ): Promise<{ [address: string]: CurrencyAmount | undefined }> {
    const multicallContract = this.swapMulticall.swapContract.useMulticallContract();
    const addresses: string[] = uncheckedAddresses
      ? uncheckedAddresses
          .map(isAddress)
          .filter((a): a is string => a !== false)
          .sort()
      : [];

    const results = await this.swapMulticall.useSingleContractMultipleData(
      multicallContract,
      "getEthBalance",
      addresses.map((address) => [address])
    );

    return addresses.reduce<{ [address: string]: CurrencyAmount }>((memo, address, i) => {
      const value = results?.[i]?.result?.[0];
      if (value) memo[address] = CurrencyAmount.ether(JSBI.BigInt(value.toString()));
      return memo;
    }, {});
  }

  /**
   * Returns a map of token addresses to their eventually consistent token balances for a single account.
   */
  public async useTokenBalancesWithLoadingIndicator(
    address?: string,
    tokens?: (Token | undefined)[]
  ): Promise<[{ [tokenAddress: string]: TokenAmount | undefined }, boolean]> {
    const validatedTokens: Token[] = tokens?.filter((t?: Token): t is Token => isAddress(t?.address) !== false) ?? [];

    const validatedTokenAddresses = validatedTokens.map((vt) => vt.address);

    const balances = await this.swapMulticall.useMultipleContractSingleData(
      validatedTokenAddresses,
      ERC20_INTERFACE,
      "balanceOf",
      [address]
    );

    // @ts-ignore
    const anyLoading: boolean = balances.some((callState) => callState.loading);

    return [
      address && validatedTokens.length > 0
        ? validatedTokens.reduce<{ [tokenAddress: string]: TokenAmount | undefined }>((memo, token, i) => {
            const value = balances?.[i]?.result?.[0];
            const amount = value ? JSBI.BigInt(value.toString()) : undefined;
            if (amount) {
              memo[token.address] = new TokenAmount(token, amount);
            }
            return memo;
          }, {})
        : {},
      anyLoading
    ];
  }

  public async useTokenBalances(
    address?: string,
    tokens?: (Token | undefined)[]
  ): Promise<{ [tokenAddress: string]: TokenAmount | undefined }> {
    const data = await this.useTokenBalancesWithLoadingIndicator(address, tokens);
    return data[0];
  }

  // get the balance for a single token/account combo
  public useTokenBalance = async (account?: string, token?: Token): Promise<TokenAmount | undefined> => {
    const tokenBalances = await this.useTokenBalances(account, [token]);
    if (!token) return undefined;
    return tokenBalances[token.address];
  };

  public useCurrencyBalances = async (
    account?: string,
    currencies?: (Currency | undefined)[]
  ): Promise<(CurrencyAmount | undefined)[]> => {
    const tokens = currencies?.filter((currency): currency is Token => currency instanceof Token) ?? [];

    const tokenBalances = await this.useTokenBalances(account, tokens);
    const containsETH: boolean = currencies?.some((currency) => currency === ETHER) ?? false;
    const ethBalance = await this.useETHBalances(containsETH ? [account] : []);

    return (
      currencies?.map((currency) => {
        if (!account || !currency) return undefined;
        if (currency instanceof Token) return tokenBalances[currency.address];
        if (currency === ETHER) return ethBalance[account];
        return undefined;
      }) ?? []
    );
  };

  public async useCurrencyBalance(account?: string, currency?: Currency): Promise<CurrencyAmount | undefined> {
    const results = await this.useCurrencyBalances(account, [currency]);
    return results[0];
  }
}
