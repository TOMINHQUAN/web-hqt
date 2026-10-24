// Đường dẫn file: server.js
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cấu hình kết nối SQL Server
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'WorldCup26_db',
  // port: 1433, <-- Comment hoặc xóa dòng này đi
  options: {
    instanceName: process.env.DB_INSTANCE, // Thêm dòng này để nhận MSSQLSERVER02
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  // ...
};

let poolPromise = null;

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig)
      .then((pool) => {
        console.log('✅ Đã kết nối thành công tới SQL Server: WorldCup26_db');
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error('❌ Lỗi kết nối SQL Server:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

// =========================================================================
// 1. API: Lấy danh sách trận đấu (Match Results & Tournament Matches)
// =========================================================================
app.get('/api/matches', async (req, res) => {
  try {
    const { stage, group } = req.query;
    const pool = await getPool();
    const request = pool.request();

    request.input('stage_filter', sql.NVarChar(100), stage || null);
    request.input('group_filter', sql.NVarChar(10), group || null);

    const result = await request.execute('sp_GetMatches');
    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      data: result.recordset
    });
  } catch (error) {
    console.error('Lỗi /api/matches:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. API: Lấy chi tiết 1 trận đấu (Match Center Modal: Sân, Trọng tài, Sự kiện)
// =========================================================================
app.get('/api/matches/:id', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id, 10);
    if (isNaN(matchId)) {
      return res.status(400).json({ success: false, message: 'match_id không hợp lệ' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('match_id', sql.Int, matchId)
      .execute('sp_GetMatchCenterDetail');

    res.json({
      success: true,
      matchInfo: result.recordsets[0]?.[0] || null,
      teamStats: result.recordsets[1] || [],
      events: result.recordsets[2] || []
    });
  } catch (error) {
    console.error('Lỗi /api/matches/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. API: Lấy Bảng xếp hạng 12 bảng đấu (Tournament -> Group Standings)
// =========================================================================
app.get('/api/standings', async (req, res) => {
  try {
    const { group } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT 
        group_rank, team_id, team_name, fifa_code_name, groupp,
        confederation, played, won, drawn, lost,
        goals_for, goals_against, goal_diff, pts, is_qualified
      FROM vw_GroupStandings
    `;

    if (group) {
      query += ` WHERE groupp = @group `;
      request.input('group', sql.NVarChar(10), group);
    }

    query += ` ORDER BY groupp ASC, group_rank ASC`;

    const result = await request.query(query);
    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Lỗi /api/standings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. API: Lấy danh sách 48 đội tuyển (Phục vụ Search & Quick Pick ở Team Stats)
// =========================================================================
app.get('/api/teams', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        team_id, team_name, fifa_code_name, groupp, 
        confederation, fifa_ranking_per_tournament, elo_rating, coach_name
      FROM teams
      ORDER BY ISNULL(fifa_ranking_per_tournament, 999) ASC, team_name ASC
    `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Lỗi /api/teams:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 5. API: Lấy toàn bộ Dashboard thống kê của 1 Đội tuyển (Team Stats)
// =========================================================================
app.get('/api/teams/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) {
      return res.status(400).json({ success: false, message: 'team_id không hợp lệ' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('team_id', sql.Int, teamId)
      .execute('sp_GetTeamDashboard');

    res.json({
      success: true,
      overview: result.recordsets[0]?.[0] || null,
      recentForm: result.recordsets[1] || [],
      topRatedPlayer: result.recordsets[2]?.[0] || null,
      squad: result.recordsets[3] || []
    });
  } catch (error) {
    console.error('Lỗi /api/teams/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 6. API: Lấy Bảng xếp hạng Vua phá lưới (Player Stats - Golden Boot)
// =========================================================================
app.get('/api/players', async (req, res) => {
  try {
    const { search } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let query = `SELECT * FROM vw_PlayerLeaderboard`;

    if (search && search.trim() !== '') {
      query += ` WHERE player_name LIKE @search OR team_name LIKE @search `;
      request.input('search', sql.NVarChar(100), `%${search.trim()}%`);
    }

    query += ` ORDER BY rank_no ASC`;

    const result = await request.query(query);
    res.json({
      success: true,
      totalPlayers: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    console.error('Lỗi /api/players:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 7. API: Lấy chi tiết hiệu suất 1 Cầu thủ (Player Detail View)
// =========================================================================
app.get('/api/players/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (isNaN(playerId)) {
      return res.status(400).json({ success: false, message: 'player_id không hợp lệ' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('player_id', sql.Int, playerId)
      .query(`SELECT * FROM vw_PlayerLeaderboard WHERE player_id = @player_id`);

    if (!result.recordset[0]) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cầu thủ' });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Lỗi /api/players/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Điều hướng mặc định về index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 WC 2026 Data Hub đang chạy tại: http://localhost:${PORT}`);
});