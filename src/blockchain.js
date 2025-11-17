const crypto =require('crypto')
const dgram = require('dgram')
const rsa = require('./rsa')

// 创世区块
const initBlock = {
  index: 0,
  data: 'hello gloriaChain',
  preHash: '0',
  timestamp: 1754386942817,
  nonce: 139174,
  hash: '00004e044bdff6b934b5580aa2898894cd2a40dbee523b2839e960f50f13e6b1'
}
class blockchain{
  constructor(){
    this.blockchain = [
      initBlock
    ]
    this.data = []
    this.difficulty = 4

    this.peers = []
    this.remote = {}

    this.seed ={port:8001,address:'localhost'}
    this.udp = dgram.createSocket('udp4')
    this.init()
    // const hash = this.computeHash(0,'0',new Date().getTime(),'hello gloriaChain',1)
    // console.log(hash)
  }

  init(){
    this.bindP2p()
    this.bindExit()
  }
  bindP2p(){
    this.udp.on('message',(msg,remote)=>{
      const {address,port} = remote
      // const data = JSON.parse(msg.toString())
      const action = JSON.parse(msg)
      if(action.type ){
        this.dispatch(action,{address,port})  // 调用dispatch方法，传递action和包含address、port的对象作为参数
      }
    })
    this.udp.on('listening',()=>{
      const {port} = this.udp.address()
      console.log('udp服务已启动，端口为',port)
    })
    // 区分种子节点和普通节点  普通节点的端口为0即可（随便一个空闲端口即可）
    // 种子节点端口必须约定好
    console.log('process.argv',process.argv)  //输出结果为node的路径和本地执行文件的命令
    const port = Number(process.argv[2])||0
    this.startNode(port)
  }
  bindExit(){
    process.on('exit',()=>{
      console.log('exit退出退出退出')
    })
  }
  startNode(port){
    this.udp.bind(port)
    // 如果不是种子节点，需要发送一个消息告诉种子节点我来了
    if(port !== 8001){
      this.send({
        type: 'newPeer'
      },this.seed.port,this.seed.address)
      // 把种子节点加入到本地节点中
      this.peers.push(this.seed)
    }
  }
  send(message,port,host){
    // console.log('发送消息',message,port,host)
    this.udp.send(JSON.stringify(message),port,host)
  }
  boardcast(message){
    // 广播全场
    this.peers.forEach(p=>{
      this.send(message,p.port,p.address)
    })
  }
  dispatch(action,remote){
    // 接收到网络的消息在这里处理
    switch(action.type){
      case 'newPeer':
        // 种子节点要做的事情：
        // 1.你的公网ip和port
        this.send({
          type: 'remoteAddress',
          data: remote
        },remote.port,remote.address)
        // 2.现在全部节点的列表
        this.send({
          type: 'peerslsit',
          data: this.peers
        },remote.port,remote.address)
        // 3.告诉所有已知节点，来了个新朋友，快打招呼
        this.boardcast({
          type: 'sayHi',
          data: remote
        })
        // 4.告诉你现在区块链的数据
        this.send({
          type: 'blockchain',
          data:JSON.stringify({
            blockchain:this.blockchain,
            trans: this.data
          })
        },remote.port,remote.address)
        console.log('有新节点加入',remote)
        break
      case 'blockchain':
        // 同步本地链
        let allData = JSON.parse(action.data)
        let newChain = allData.blockchain
        let newTrans = allData.trans
        this.replaceChain(newChain)
        this.replaceTrans(newTrans)
        this
        break
      case 'remoteAddress':
        // 储存远程小，退出的时候用
        this.remote = action.data
        break
      case 'peerslsit':
        // 远程告诉我，现在的节点列表
        const newPeers = action.data
        this.addPeers(newPeers)
        break
      case 'sayHi':
        let remotePeer = action.data
        this.peers.push(remoteAddress)
        console.log('新朋友你好')
        this.send({
          type: 'Hi',
          data:'Hi'
        },remotePeer.port,remotePeer.address)
        break
      case 'Hi':
        console.log(`${remote.address}:${remote.port}说：${action.data}`)
        break
      case 'trans':
        // 网络上收到的交易请求
        // 判断重复交易
        if(!this.data.find(d=>this.isEqualObject(d,action.data)))
          {
            console.log('收到交易请求',action.data)
            this.addTransaction(action.data)
            this.boardcast({
              type: 'trans',
              data: action.data
            })
          }
        break
      case 'mine':
        const lastBlock = this.getLastBlock()
        if(lastBlock.hash === action.data.hash){
          console.log('新区块已经存在')
          return
        }
        if(this.isVaildBlock(action.data,lastBlock)){
          console.log('挖出新区块')
          this.blockchain.push(action.data)
          this.data = []
          this.boardcast({
            type: 'newBlock',
            data: action.data
          })
        }else{
          console.log('区块不合法')
        }
        break
      default:
        console.log('未知消息',action,remote)
    }
  }
  isEqualObject(obj1,obj2){
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)
    if(keys1.length !== keys2.length){
      return false
    }
    return keys1.every(key=>{
      return obj1[key] === obj2[key]
    })
  }
  isEqualPeer(peer1,peer2){
    return peer1.address === peer2.address && peer1.port === peer2.port
  }

  addPeers(peers){
    peers.forEach(peer=>{
      if(!this.peers.find(p=>{
        return p.address === peer.address && p.port === peer.port
      })){
        this.peers.push(peer)
      }
    })
  }
  // 获取最新区块
  getLastBlock(){
    return this.blockchain[this.blockchain.length - 1]
  }

  // 交易
  transfer(from,to,amount){
    const timestamp = new Date().getTime()
    const signature = rsa.sign({from,to,amount,timestamp})
    // console.log('sig',sig)
    const transObj = {from,to,amount,timestamp,signature}
    this.data.push(transObj)

    // 签名校验
    if(from !=='0'){
      // 是交易非挖矿
      const blance = this.blance(from)
      if(blance < amount){
        console.log('余额不足',from, blance, amount)
        return
      }
    }

    this.boardcast({
      type: 'trans',
      data: transObj
    })
    this.data.push(transObj)
    return transObj
  }
  // 查看余额
  blance(address){
    let blance =0
    this.blockchain.forEach(block=>{
      if(block.index === 0){
        // 创世区块
        return
      }
      if(!Array.isArray(block.data)){
        return
      }
      // console.log('block.data',block.data)
      block.data.forEach(trans=>{
        if(address == trans.from){
          blance -= trans.amount
        }
        if(address == trans.to){
          blance += trans.amount
        }
      })
    })
    return blance
  }
  isValidTrans(trans){
    // 1.交易签名合法
    // 2.交易金额合法
    // 3.交易发起者余额足够
    return rsa.verify(trans,trans.from)
  }
  addTransaction(trans){
    if(this.isValidTrans(trans)){
      this.data.push(trans)
    }
  }
  // 挖矿
  mine(address){
    // 校验所有交易的合法性
    // if(!this.data.every(v=>this.isValidTrans(v))){
    //   console.log('交易不合法')
    //   return
    // }
    // 过滤不合法的交易
    this.data =this.data.filter(v=>this.isValidTrans(v))
    // 1.生成新区块
    // 2.计算哈西，直到符合难度条件，新增区块
    // 挖矿结束，需要给矿工奖励100
    this.transfer('0',address,100)
    const newBlock = this.generateNewBlock()
    // 区块合法 并且区块链合法 则新增
    if(this.isVaildBlock(newBlock)&& this.isVaildChain()){
      this.blockchain.push(newBlock)
      // 清空交易数组，准备收集下一批交易
      this.data = []
      this.boardcast({
        type: 'mine',
        data: newBlock
      })
      return newBlock
    }else{
      console.log('区块不合法',newBlock)
    }  
  }

  // 生成新区块
  generateNewBlock(){
    let nonce =0
    const index =this.blockchain.length
    const data = this.data
    const preHash = this.getLastBlock().hash
    let timestamp = new Date().getTime()
    let hash = this.computeHash(index,preHash,timestamp,data,nonce)
    while(hash.slice(0,this.difficulty) !== '0'.repeat(this.difficulty)){
      nonce++
      hash = this.computeHash(index,preHash,timestamp,data,nonce)
    }
    return{
      index,
      data,
      preHash,
      timestamp,
      nonce,
      hash}
  }

  // 计算哈希
  computeHash(index,preHash,timestamp,data,nonce){
    return crypto.createHash('sha256').update(index + preHash + timestamp + JSON.stringify(data) + nonce).digest('hex')
  }

  computeHashForBlock({index,preHash,timestamp,data,nonce}){
    return this.computeHash(index,preHash,timestamp,data,nonce)
  }

  // 校验区块
  isVaildBlock(newBlock,lastBlock=this.getLastBlock()){
    // 1.区块的index等于最新区块的index+1
    // 2.区块的time大于最新区块的time
    // 3.区块的preHash等于最新区块的hash
    // 4.区块的hash符合难度条件
    // 5.区块的hash值计算正确
    if(newBlock.index !== lastBlock.index + 1){
      return false
    }else if(newBlock.timestamp <= lastBlock.timestamp){
      return false
    }else if(newBlock.preHash !== lastBlock.hash){
      return false
    }else if(newBlock.hash.slice(0,this.difficulty) !== '0'.repeat(this.difficulty)){
      return false
    }else if(newBlock.hash !== this.computeHashForBlock(newBlock)){
      return false
    }
    return true
  }

  // 校验区块链
  isVaildChain(chain = this.blockchain){
    // 除创世区块外的区块逐个校验
    for(let i=chain.length-1;i>0;i--){
      if(!this.isVaildBlock(chain[i],chain[i-1])){
        return false
      }
    }
    if(JSON.stringify(chain[0]) !== JSON.stringify(initBlock)){
      return false
    }
    return true
  }

  replaceChain(newChain){
    // 不校验交易，只校验区块链
    if(newChain.length ==1){
      return
    }
    if(newChain.length > this.blockchain.length && this.isVaildChain(newChain)){
      this.blockchain = JSON.parse(JSON.stringify(newChain))
    }else{
      console.log('新链不合法')
    }
  }

  replaceTrans(trans){
    if(trans.every(v=>this.isValidTrans(v))){
      this.data = trans
    }
  }
}

module.exports = blockchain