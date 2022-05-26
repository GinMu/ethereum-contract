import { ChainId, JSBI, Percent, Token, WETH } from "../@uniswap/sdk";

export const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

enum HecoId {
  MAINNET = 128
}

enum BscId {
  MAINNET = 56
}

// a list of tokens by chain
type ChainTokenList = {
  readonly [chainId in ChainId | HecoId | BscId]: Token[];
};

// ethereum token
export const DAI = new Token(
  ChainId.MAINNET,
  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  18,
  "DAI",
  "Dai Stablecoin"
);
export const USDC = new Token(ChainId.MAINNET, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 6, "USDC", "USD//C");
export const USDT = new Token(ChainId.MAINNET, "0xdAC17F958D2ee523a2206206994597C13D831ec7", 6, "USDT", "Tether USD");
export const COMP = new Token(ChainId.MAINNET, "0xc00e94Cb662C3520282E6f5717214004A7f26888", 18, "COMP", "Compound");
export const MKR = new Token(ChainId.MAINNET, "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", 18, "MKR", "Maker");
export const AMPL = new Token(ChainId.MAINNET, "0xD46bA6D942050d489DBd938a2C909A5d5039A161", 9, "AMPL", "Ampleforth");
export const TPT = new Token(
  ChainId.MAINNET,
  "0x4161725D019690a3E0de50f6bE67b07a86A9fAe1",
  4,
  "TPT",
  "TokenPocket Token"
);

// heco token
export const WHT = new Token(128, "0x5545153CCFcA01fbd7Dd11C0b23ba694D9509A6F", 18, "WHT", "Wrapped Huobi Token");
export const HUSD = new Token(128, "0x0298c2b32eaE4da002a15f36fdf7615BEa3DA047", 8, "HUSD", "Heco-Peg HUSD Token");
export const HUSDT = new Token(
  128,
  "0xa71EdC38d189767582C38A3145b5873052c3e47a",
  18,
  "HUSDT",
  "Heco-Peg USDTHECO Token"
);
export const HTPT = new Token(128, "0x9ef1918a9beE17054B35108bD3E2665e2Af1Bb1b", 4, "Heco TPT", "TokenPocket Token");

// bsc token
export const WBNB = new Token(56, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, "WBNB", "Wrapped BNB");
export const BUSD = new Token(56, "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 18, "BUSD", "Binance-Peg BUSD Token");
export const BUSDT = new Token(56, "0x55d398326f99059fF775485246999027B3197955", 18, "BUSDT", "Binance-Peg BUSD-T");
export const BTPT = new Token(56, "0xECa41281c24451168a37211F0bc2b8645AF45092", 4, "BSC TPT", "TokenPocket Token");

const WETH_ONLY: ChainTokenList = {
  [ChainId.MAINNET]: [WETH[ChainId.MAINNET]],
  [ChainId.ROPSTEN]: [WETH[ChainId.ROPSTEN]],
  [ChainId.RINKEBY]: [WETH[ChainId.RINKEBY]],
  [ChainId.GÖRLI]: [WETH[ChainId.GÖRLI]],
  [ChainId.KOVAN]: [WETH[ChainId.KOVAN]],
  [HecoId.MAINNET]: [WHT],
  [BscId.MAINNET]: [WBNB]
};

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, USDC, USDT, COMP, MKR],
  [HecoId.MAINNET]: [...WETH_ONLY[HecoId.MAINNET], HUSD, HUSDT],
  [BscId.MAINNET]: [...WETH_ONLY[BscId.MAINNET], BUSD, BUSDT]
};

/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId in ChainId]?: { [tokenAddress: string]: Token[] } } = {
  [ChainId.MAINNET]: {
    [AMPL.address]: [DAI, WETH[ChainId.MAINNET]]
  }
};

// used for display in the default list when adding liquidity
export const SUGGESTED_BASES: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, USDC, USDT]
};

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WETH_ONLY,
  [ChainId.MAINNET]: [...WETH_ONLY[ChainId.MAINNET], DAI, USDC, USDT]
};

export const PINNED_PAIRS: { readonly [chainId in ChainId]?: [Token, Token][] } = {
  [ChainId.MAINNET]: [
    [
      new Token(ChainId.MAINNET, "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643", 8, "cDAI", "Compound Dai"),
      new Token(ChainId.MAINNET, "0x39AA39c021dfbaE8faC545936693aC917d5E7563", 8, "cUSDC", "Compound USD Coin")
    ],
    [USDC, USDT],
    [DAI, USDT]
  ]
};

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 50;
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20;

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000));
export const BIPS_BASE = JSBI.BigInt(10000);
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE); // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE); // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE); // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN: Percent = new Percent(JSBI.BigInt(1000), BIPS_BASE); // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE); // 15%

// used to ensure the user doesn't send so much ETH so they end up with <.01
export const MIN_ETH: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)); // .01 ETH
export const BETTER_TRADE_LINK_THRESHOLD = new Percent(JSBI.BigInt(75), JSBI.BigInt(10000));
