"""Authenticated personal-best rankings. Scores are client reported, not anti-cheat verified."""
import time

GAMES = {'tetris', '2048'}

def initialize(db):
    db.execute('''CREATE TABLE IF NOT EXISTS game_scores (
        game TEXT NOT NULL, user_id TEXT NOT NULL, score INTEGER NOT NULL,
        achieved REAL NOT NULL, PRIMARY KEY(game,user_id))''')

def save(db, member, game, score):
    if game not in GAMES or type(score) is not int or not 0 <= score <= 1_000_000_000:
        raise ValueError('게임과 점수를 확인해주세요.')
    if score:
        db.execute('''INSERT INTO game_scores VALUES (?,?,?,?)
            ON CONFLICT(game,user_id) DO UPDATE SET score=excluded.score,achieved=excluded.achieved
            WHERE excluded.score > game_scores.score''', (game, member['id'], score, time.time()))
    return ranking(db, member, game)

def ranking(db, member, game):
    if game not in GAMES:
        raise ValueError('지원하지 않는 게임이에요.')
    rows = db.execute('''SELECT s.user_id,u.username,s.score,s.achieved FROM game_scores s
        JOIN users u ON u.id=s.user_id WHERE s.game=? AND u.approved=1
        ORDER BY s.score DESC,s.achieved ASC,s.user_id''', (game,)).fetchall()
    ranked=[{'rank':i+1,'username':r['username'],'score':r['score'],'mine':r['user_id']==member['id']} for i,r in enumerate(rows)]
    return {'game':game,'rows':ranked[:20],'me':next((r for r in ranked if r['mine']),None)}
