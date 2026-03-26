const matchEngine = require('./services/matchEngine');
const marketSimulator = require('./services/marketSimulator');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 客户端连接:', socket.id);

    // 订阅交易对行情
    socket.on('subscribe', (data) => {
      const { pairId } = data;
      if (pairId) {
        socket.join(`pair_${pairId}`);
        console.log(`👤 ${socket.id} 订阅了交易对 ${pairId}`);

        // 发送当前订单簿深度
        const depth = matchEngine.getOrderBook(pairId, 20);
        socket.emit('depth', { pairId, ...depth });
      }
    });

    // 取消订阅
    socket.on('unsubscribe', (data) => {
      const { pairId } = data;
      if (pairId) {
        socket.leave(`pair_${pairId}`);
        console.log(`👤 ${socket.id} 取消订阅交易对 ${pairId}`);
      }
    });

    // 订阅K线数据
    socket.on('subscribeKline', (data) => {
      const { pairId, period } = data;
      if (pairId && period) {
        socket.join(`kline_${pairId}_${period}`);
        console.log(`👤 ${socket.id} 订阅了K线 ${pairId}/${period}`);

        // 发送历史K线数据
        marketSimulator.getKlineHistory(pairId, period, 100).then(history => {
          socket.emit('klineHistory', { pairId, period, data: history });
        });
      }
    });

    // 获取实时行情
    socket.on('getTicker', async (data) => {
      const { pairId } = data;
      if (pairId) {
        try {
          const pair = await db.getOne(
            'SELECT * FROM trading_pairs WHERE id = ?',
            [pairId]
          );
          if (pair) {
            socket.emit('ticker', {
              pairId: pair.id,
              symbol: pair.symbol,
              price: pair.price,
              change: pair.price_change_24h,
              high: pair.high_24h,
              low: pair.low_24h,
              volume: pair.volume_24h
            });
          }
        } catch (err) {
          console.error('获取行情失败:', err);
        }
      }
    });

    // 获取订单簿深度
    socket.on('getDepth', (data) => {
      const { pairId } = data;
      if (pairId) {
        const depth = matchEngine.getOrderBook(pairId, 20);
        socket.emit('depth', { pairId, ...depth });
      }
    });

    // 用户私有频道（需要认证）
    socket.on('auth', async (data) => {
      const { token } = data;
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.join(`user_${decoded.userId}`);
        console.log(`🔐 ${socket.id} 已认证，用户ID: ${decoded.userId}`);
        socket.emit('auth_success', { userId: decoded.userId });
      } catch (err) {
        socket.emit('auth_error', { message: '认证失败' });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('🔌 客户端断开:', socket.id);
    });
  });

  // 全局事件转发
  // 成交广播到对应交易对房间
  const originalEmit = io.emit;
  io.emit = function(event, data) {
    if (event === 'trade' && data.pairId) {
      io.to(`pair_${data.pairId}`).emit('trade', data);
    }
    if (event === 'ticker' && data.pairId) {
      io.to(`pair_${data.pairId}`).emit('ticker', data);
    }
    if (event === 'kline' && data.pairId && data.period) {
      io.to(`kline_${data.pairId}_${data.period}`).emit('kline', data);
    }
    return originalEmit.apply(this, arguments);
  };
};