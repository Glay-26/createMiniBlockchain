/**
 * 引入Vorpal命令行界面库
 * Vorpal是一个强大的Node.js命令行界面库，可以帮助我们构建交互式命令行应用程序
 */
const vorpal = require('vorpal')();
/**
 * 引入cli-table库
 * cli-table是一个用于在终端中创建格式化表格的Node.js模块
 * 可以帮助我们以美观的表格形式展示数据
 */
const Table = require('cli-table');


/**
 * 引入自定义的Blockchain模块
 * 这个模块包含了区块链的核心实现逻辑
 */
const Blockchain = require('./blockchain');
const blockchain = new Blockchain();

const rsa = require('./rsa')

// 定义一个函数，用于格式化日志数据
function formatLog(data){
  // 判断传入的数据是否为数组
  if(!data || data.length === 0){
    return;
  }
  if(!Array.isArray(data)){
    // 如果不是数组，将数据转换为数组
    data = [data]   ;
  }
  const first =data[0]
  const head = Object.keys(first)
  var table = new Table({
    head: head
  , colWidths: new Array(head.length).fill(20)
});
// const res =data.map(item=>{
//   return head.values(item)
// })
// 遍历data数组中的每个元素，将其与head数组中的每个元素进行映射
const res =data.map(v=>{
  // 遍历head数组中的每个元素
  return head.map(h=>JSON.stringify(v[h],null,1))
})
// 将res数组中的所有元素添加到table数组的末尾
table.push(...res);
console.log(table.toString());
}

// instantiate
// var table = new Table({
//     head: ['TH 1 label', 'TH 2 label']
//   , colWidths: [10, 20]
// });

// // table is an Array, so you can `push`, `unshift`, `splice` and friends
// table.push(
//     ['First value', 'Second value']
//   , ['First value', 'Second value']
// );

// console.log(table.toString());

// vorpal
//   .command('Hi', '命令名称')
//   .action(function(args, callback) {
//     this.log('你好web3');
//     callback();
//   });

vorpal
  .command('trans <to> <amount>', '转账')
  .action(function(args, callback) {
    // 本地公钥作为转出地址
    let trans = blockchain.transfer(rsa.keys.publicKey,args.to, args.amount);
    if(trans){
      formatLog(trans);
    }
    callback();
  });

vorpal
  .command('detail <index>', '查看区块详情')
  .action(function(args, callback) {
    const block = blockchain.blockchain[args.index];
    this.log(JSON.stringify(block, null, 2));
    callback();
  })
vorpal
  .command('mine', '出块奖励')
  .action(function(args, callback) {
    const newBlock =blockchain.mine(rsa.keys.publicKey)
    if(newBlock){
     formatLog(`挖矿成功，区块hash：${newBlock.hash}`)
    }
    // this.log('你好web3');
    callback();
  });

  vorpal
  .command('chain', '查看区块链')
  .action(function(args, callback) {
    formatLog(blockchain.blockchain);
    callback();
  });

  vorpal
  .command('pub', '查看本地地址')
  .action(function(args, callback) {
    console.log(rsa.keys.publicKey);
    callback();
  });

  vorpal
  .command('peers', '查看网络节点列表')
  .action(function(args, callback) {
    formatLog(blockchain.peers);
    callback();
  });

  vorpal
  .command('chat<message>', '跟别的节点hi一下')
  .action(function(args, callback) {
    blockchain.boardcast({
      type:'Hi',
      data:args.message
  });
    callback();
  });
  
  vorpal
  .command('balance <address>', '查看余额')
  .action(function(args, callback) {
    const balance = blockchain.blance(args.address);
    if(balance){
      console.log(`地址${args.address}的余额为${balance}`)
    }
    callback();
  })

  vorpal
  .command('pending', '查看还没有被打包的交易')
  .action(function(args, callback) {
    formatLog(blockchain.data);
    callback();
  })

  console.log('welcome to woniu-chain');
  vorpal.exec('help')
  vorpal
// 设置分隔符为'woniu-chain====>'，用于格式化输出显示
    .delimiter('woniu-chain====>')  // 使用.delimiter方法设置分隔符
    .show();  // 调用show方法显示结果