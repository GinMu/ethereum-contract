# ETHEREUM-CONTRACT

## 初始化

```javascript
import { NFTDao } from "@jccdex/ethereum-contract";

const options = {
  account: ethereum.selectedAddress,
  chainId: "以太坊chain id",
  web3: this.web3,
  nftDaoContract: "以太坊nft dao合约地址",
  multicallAddress: "以太坊multicall合约地址"
};
const nftDao = new NFTDao(options);

const nft = "NFT合约地址";
const id = "NFT id";
const jingtum = "井通地址";
const fee = "手续费，默认为0";

// 充币，从以太坊到井通

// 充币前需检查nft是否授权给nft dao合约，调用erc-721.ts isApprovedForAll方法
// 如果未授权，调用setApprovalForAll方法
const result = await nftDao.deposit(nft, id, jingtum, fee);
```
