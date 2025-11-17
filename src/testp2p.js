// 引入dgram模块
const dgram = require('dgram')
// 创建一个UDP4套接字
const udp = dgram.createSocket('udp4')

udp.on('message', (msg, rinfo) => {
  console.log('accept message'+ msg.toString())
  console.log(rinfo)
})

udp.on('listening', function() {
  const address = udp.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

udp.bind(8002)

function sendMsg(message,port,host) {
  console.log('send message', message,port,host)
  udp.send(Buffer.from(message),port,host)
}

console.log(process.argv)