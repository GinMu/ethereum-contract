import { Token } from "./token";
import { ChainId } from "../constants";

/**
 * Represents an ERC20 token with a unique address and some metadata.
 */
export class Token721 extends Token {
  public constructor(chainId: ChainId, address: string, symbol?: string, name?: string) {
    super(chainId, address, 0, symbol, name);
  }
}
