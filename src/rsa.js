// 1.公私钥对
// 2.公钥直接当成地址用（或者截取公钥前20位）
// 3.公钥可以通过私钥计算得出

// 引入fs库，用于文件操作
let fs = require('fs');
// 引入elliptic库
let EC = require('elliptic').ec;

// 创建一个椭圆曲线对象
let ec = new EC('secp256k1');

// 生成一个新的密钥对
let key = ec.genKeyPair();

// 获取公钥和私钥
// let res ={
//     publicKey: key.getPublic('hex'),
//     privateKey: key.getPrivate('hex')
// }

function getPub(prv){
  // 根据私钥算出公钥
  return ec.keyFromPrivate(prv).getPublic('hex').toString()
}
const keys = generateKeys()
console.log(keys)
generateKeys()
// 1.获取公私钥对（持久化）
function generateKeys(){
  const fileName = './wallet.json';
  try {
    let res =JSON.parse(fs.readFileSync(fileName)) ;
    if(res.privateKey && res.publicKey && getPub(res.privateKey)==res.publicKey){
// 从私钥创建椭圆曲线密钥对
// 使用 elliptic 库的 keyFromPrivate 方法
// 将私钥转换为可用于签名和验证的密钥对对象
      keypair = ec.keyFromPrivate(res.privateKey)
      return res
    }else{
      throw new Error('私钥和公钥不匹配')
    }
  }catch (err) {
    // console.log(err)
    const res = {
      publicKey: key.getPublic('hex').toString(),
      privateKey: key.getPrivate('hex').toString()
    }
    fs.writeFileSync(fileName, JSON.stringify(res))
    return res
  }
}

// 2.签名
function sign({from,to,amount,timestamp}){
  // 将from、to和amount拼接成一个字符串，并转换为Buffer
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
  // 使用keypair对bufferMsg进行签名，并转换为DER格式，再转换为十六进制字符串
  let signature = Buffer.from(keypair.sign(bufferMsg).toDER()).toString('hex')
  return signature
}

// 3.校验签名
function verify({from,to,amount,timestamp,signature},publicKey){
  // 校验没有私钥，只用公钥进行校验
  // 返回一个密钥对象，该对象包含了椭圆曲线公钥的所有信息，并提供了各种操作方法，如验证签名、加密数据等。
  const keypairTemp = ec.keyFromPublic(publicKey,'hex')
  const bufferMsg = Buffer.from(`${timestamp}-${amount}-${from}-${to}`)
  return keypairTemp.verify(bufferMsg,signature)
}

// const trans ={from:'0x123',to:'0x456',amount:100}
// const signature = sign(trans)
// console.log(signature)

// trans.signature = signature
// const isValid = verify(trans,keys.publicKey)
// console.log(isValid)
module.exports = {
  keys,
  sign,
  verify
}