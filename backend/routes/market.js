const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error } = require('../utils/helpers');

// 获取所有交易对
router.get('/pairs', async (req, res) => {
  try {
    const pairs = await db.query(
      `SELECT tp.*, 
              bc.symbol as base_symbol, bc.name as base_name,
              qc.symbol as quote_symbol, qc.name as quote_name
       FROM trading_pairs tp
       JOIN coins bc ON tp.base_coin_id = bc.id
       JOIN coins qc ON tp.quote_coin_id = qc.id
       WHERE tp.status = 1
       ORDER BY tp.sort_order ASC`
    );

    res.json(success(pairs));
  } catch (err) {
    console.error('Get pairs error:', err);
    res.json(error('获取交易对失败'));
  }
});

// 获取单个交易对详情
router.get('/pairs/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const pair = await db.getOne(
      `SELECT tp.*, 
              bc.symbol as base_symbol, bc.name as base_name,
              qc.symbol as quote_symbol, qc.name as quote_name
       FROM trading_pairs tp
       JOIN coins bc ON tp.base_coin_id = bc.id
       JOIN coins qc ON tp.quote_coin_id = qc.id
       WHERE tp.symbol = ? AND tp.status = 1`,
      [symbol]
    );

    if (!pair) {
      return res.json(error('交易对不存在'));
    }

    res.json(success(pair));
  } catch (err) {
    console.error('Get pair error:', err);
    res.json(error('获取交易对详情失败'));
  }
});

// 获取K线数据 (通过 pairId)
router.get('/kline', async (req, res) => {
  try {
    const { pairId, period = '1h', limit = 100 } = req.query;

    if (!pairId) {
      return res.json(error('请提供交易对ID'));
    }

    const klines = await db.query(
      `SELECT timestamp, open, high, low, close, volume
       FROM kline_data
       WHERE pair_id = ? AND period = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [String(pairId), String(period), String(limit)]
    );

    res.json(success(klines.reverse()));
  } catch (err) {
    console.error('Get kline error:', err);
    res.json(error('获取K线数据失败'));
  }
});

// 获取K线数据 (通过 symbol)
router.get('/kline/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1h', limit = 100 } = req.query;

    const pair = await db.getOne(
      'SELECT id FROM trading_pairs WHERE symbol = ?',
      [symbol]
    );

    if (!pair) {
      return res.json(error('交易对不存在'));
    }

    const klines = await db.query(
      `SELECT timestamp, open, high, low, close, volume
       FROM kline_data
       WHERE pair_id = ? AND period = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [String(pair.id), String(period), String(limit)]
    );

    // 按时间正序返回
    res.json(success(klines.reverse()));
  } catch (err) {
    console.error('Get kline error:', err);
    res.json(error('获取K线数据失败'));
  }
});

// 获取深度数据 (盘口)
router.get('/depth/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    const pair = await db.getOne(
      'SELECT id FROM trading_pairs WHERE symbol = ?',
      [symbol]
    );

    if (!pair) {
      return res.json(error('交易对不存在'));
    }

    // 获取买单（按价格降序）
    const bids = await db.query(
      `SELECT price, SUM(amount - filled_amount) as amount
       FROM orders
       WHERE pair_id = ? AND side = 1 AND status IN (0, 1)
       GROUP BY price
       ORDER BY price DESC
       LIMIT 20`,
      [pair.id]
    );

    // 获取卖单（按价格升序）
    const asks = await db.query(
      `SELECT price, SUM(amount - filled_amount) as amount
       FROM orders
       WHERE pair_id = ? AND side = 2 AND status IN (0, 1)
       GROUP BY price
       ORDER BY price ASC
       LIMIT 20`,
      [pair.id]
    );

    res.json(success({
      symbol,
      bids: bids.map(b => [parseFloat(b.price), parseFloat(b.amount)]),
      asks: asks.map(a => [parseFloat(a.price), parseFloat(a.amount)])
    }));
  } catch (err) {
    console.error('Get depth error:', err);
    res.json(error('获取深度数据失败'));
  }
});

// 获取最新成交
router.get('/trades/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 50 } = req.query;

    const pair = await db.getOne(
      'SELECT id FROM trading_pairs WHERE symbol = ?',
      [symbol]
    );

    if (!pair) {
      return res.json(error('交易对不存在'));
    }

    const trades = await db.query(
      `SELECT t.price, t.amount, t.created_at
       FROM trades t
       WHERE t.pair_id = ?
       ORDER BY t.created_at DESC
       LIMIT ?`,
      [pair.id, String(limit)]
    );

    res.json(success(trades));
  } catch (err) {
    console.error('Get trades error:', err);
    res.json(error('获取成交记录失败'));
  }
});

// 获取24小时行情 (Ticker)
router.get('/tickers', async (req, res) => {
  try {
    const tickers = await db.query(
      `SELECT tp.symbol, tp.price, tp.price_change_24h, 
              tp.high_24h, tp.low_24h, tp.volume_24h
       FROM trading_pairs tp
       WHERE tp.status = 1
       ORDER BY tp.sort_order ASC`
    );

    res.json(success(tickers));
  } catch (err) {
    console.error('Get tickers error:', err);
    res.json(error('获取行情失败'));
  }
});

module.exports = router;
