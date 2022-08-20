require("dotenv").config()
const ethers = require("ethers")

const json = {
  data: {
    WBNB: process.env.WBNB,
    factory: process.env.FACTORY,
    router: process.env.ROUTER,
    recipient: process.env.ADDRESS,
    tokenOut: process.env.EBA,
    mnemonic: process.env.MNEMONIC,
    wssRpc: process.env.WSS_RPC,
  },
}

const addresses = {
  WBNB: json.data.WBNB,
  factory: json.data.factory,
  router: json.data.router,
  recipient: json.data.recipient,
}

const mnemonic = json.data.mnemonic

const provider = new ethers.providers.WebSocketProvider(json.data.wssRpc)

const wallet = new ethers.Wallet(mnemonic)
const account = wallet.connect(provider)
const factory = new ethers.Contract(
  addresses.factory,
  ["event PairCreated(address indexed token0, address indexed token1, address pair, uint)"],
  account
)
const router = new ethers.Contract(
  addresses.router,
  [
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  ],
  account
)

// const wbnb = new ethers.Contract(addresses.WBNB, ["function approve(address spender, uint256 wad) public returns(bool)"], account)

// const init = async () => {
// //   const tx = await wbnb.approve(router.address, ethers.constants.MaxUint256.toString())
// //   const receipt = await tx.wait()
// //   console.log("Transaction receipt")
// //   console.log(receipt)
// }

console.log("factory", factory.address)
factory.on("PairCreated", async (token0, token1, pairAddress) => {
  console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}
  `)

  let tokenIn = token0;
  let tokenOut =token1
  if (token0 === addresses.WBNB) {
    tokenIn = token0
    tokenOut = token1
  }

  if (token1 == addresses.WBNB) {
    tokenIn = token1
    tokenOut = token0
  }

  if (typeof tokenIn === "undefined") {
    return
  }

  if (tokenOut.toLowerCase() !== json.data.tokenOut.toLowerCase()) {
    return
  }

  console.log('play')
  const amountIn = ethers.utils.parseUnits("0.5", "ether")
  const amounts = await router.getAmountsOut(amountIn.toString(), [tokenIn, tokenOut])
  const amountOutMin = ethers.utils.parseUnits("4000")
  //  const amountOutMin = (amounts[1].sub(amounts[1].div(20))).toString();
  console.log(`
    Buying new token
    =================
    tokenIn: ${amountIn.toString()} ${tokenIn} (WBNB)
    amounts: ${amounts.toString()} ${tokenIn}
    tokenOut: ${amountOutMin.toString()} ${tokenOut}
  `)
  const tx = await router.swapExactTokensForTokens(
    amountIn.toString(),
    amountOutMin.toString(),
    [tokenIn, tokenOut],
    addresses.recipient,
    9999999999999999, // 10 minutes
    {
      gasPrice: 5000000000,
      gasLimit: 1000000,
    }
  )
  const receipt = await tx.wait()
  console.log("Transaction receipt: ", receipt)
  //  console.log(receipt)
})

// init().catch((err) => {
//   console.log("error: ", err)
// })