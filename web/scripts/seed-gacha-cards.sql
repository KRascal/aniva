-- Gacha Cards Seed: テスト用
-- 各フランチャイズの全キャラにN/R/SR/SSR/URカードを生成
-- 画像はキャラのavatarUrlを使用

-- まず既存カードのfranchiseを更新
UPDATE "GachaCard" SET franchise = 'ONE PIECE' WHERE id LIKE 'gc-%';

-- ===== ONE PIECE 追加カード (SSR/UR + 残りキャラのN/R/SR) =====

-- ルフィ SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-luffy-ssr-01', '3fb36bda-bca7-40b5-a82d-3a0450bad8ea', 'ギア5 ニカ覚醒', '太陽の神ニカの力が覚醒したルフィ。自由の化身。', 'SSR', 'ONE PIECE', '/characters/luffy/avatar.webp', '/characters/luffy/avatar.webp', 'gold', 'scene'),
('gc-luffy-ur-01', '3fb36bda-bca7-40b5-a82d-3a0450bad8ea', '海賊王への意志', 'すべての夢を背負い、ラフテルを目指すルフィの究極の姿。', 'UR', 'ONE PIECE', '/characters/luffy/avatar.webp', '/characters/luffy/avatar.webp', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ゾロ SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-zoro-ssr-01', '981a5670-ad19-4569-b844-35bd3d705955', '冥王の教え 鬼気', '閻魔を完全に馴らしたゾロ。覇王色の覇気を纏う一閃。', 'SSR', 'ONE PIECE', '/characters/zoro/avatar.webp', '/characters/zoro/avatar.webp', 'gold', 'scene'),
('gc-zoro-ur-01', '981a5670-ad19-4569-b844-35bd3d705955', '世界一の大剣豪', '約束を果たす時。ミホークを超える最強の剣士。', 'UR', 'ONE PIECE', '/characters/zoro/avatar.webp', '/characters/zoro/avatar.webp', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ナミ SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-nami-ssr-01', '457d36e1-0e38-4bd8-b9a1-710dcfa3bba0', 'ゼウス使い', 'ゼウスを従えた最強の航海士。雷雲をも操る。', 'SSR', 'ONE PIECE', '/characters/nami/avatar.webp', '/characters/nami/avatar.webp', 'gold', 'scene'),
('gc-nami-ur-01', '457d36e1-0e38-4bd8-b9a1-710dcfa3bba0', '世界地図を描く女', '全ての海を見渡し、世界地図を完成させるナミ。', 'UR', 'ONE PIECE', '/characters/nami/avatar.webp', '/characters/nami/avatar.webp', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- サンジ SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-sanji-ssr-01', 'fc8d1ea9-d5f3-4666-a5be-5eada70e0325', 'イフリートジャンプ', '炎を纏った蹴りの極致。ジェルマの血統因子覚醒。', 'SSR', 'ONE PIECE', '/characters/sanji/avatar.jpg', '/characters/sanji/avatar.jpg', 'gold', 'scene'),
('gc-sanji-ur-01', 'fc8d1ea9-d5f3-4666-a5be-5eada70e0325', 'ALL BLUEの料理人', '全ての海の魚が泳ぐ伝説の海を見つけたサンジ。', 'UR', 'ONE PIECE', '/characters/sanji/avatar.jpg', '/characters/sanji/avatar.jpg', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- チョッパー SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-chopper-ssr-01', '836a0675-0c71-4294-82b5-778e61ad8738', '万能薬チョッパー', '全ての病を治す医者を目指すチョッパー。', 'SSR', 'ONE PIECE', '/characters/chopper/avatar.webp', '/characters/chopper/avatar.webp', 'gold', 'scene'),
('gc-chopper-ur-01', '836a0675-0c71-4294-82b5-778e61ad8738', '全ての病を治す医者', 'ヒルルクの桜を世界に咲かせるチョッパーの夢。', 'UR', 'ONE PIECE', '/characters/chopper/avatar.webp', '/characters/chopper/avatar.webp', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- エース N/R/SR/SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-ace-n-01', 'fef2c841-9586-4458-93c5-ca56426c7d34', 'スペード海賊団のエース', '白ひげに出会う前のエース。スペード海賊団の船長。', 'N', 'ONE PIECE', '/characters/ace/avatar.webp', '/characters/ace/avatar.webp', 'standard', 'memory'),
('gc-ace-r-01', 'fef2c841-9586-4458-93c5-ca56426c7d34', '炎拳のエース', '火拳の異名を持つエース。メラメラの実の能力者。', 'R', 'ONE PIECE', '/characters/ace/avatar.webp', '/characters/ace/avatar.webp', 'standard', 'memory'),
('gc-ace-sr-01', 'fef2c841-9586-4458-93c5-ca56426c7d34', '白ひげ海賊団2番隊', '白ひげを親父と慕うエース。最強の海賊団の一員。', 'SR', 'ONE PIECE', '/characters/ace/avatar.webp', '/characters/ace/avatar.webp', 'standard', 'scene'),
('gc-ace-ssr-01', 'fef2c841-9586-4458-93c5-ca56426c7d34', '大炎戒 炎帝', 'エースの最強技。太陽のような巨大な炎球。', 'SSR', 'ONE PIECE', '/characters/ace/avatar.webp', '/characters/ace/avatar.webp', 'gold', 'scene'),
('gc-ace-ur-01', 'fef2c841-9586-4458-93c5-ca56426c7d34', '愛されていたエース', '「愛してくれて…ありがとう」ルフィへの最期の言葉。', 'UR', 'ONE PIECE', '/characters/ace/avatar.webp', '/characters/ace/avatar.webp', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ロビン N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-robin-n-01', '303a3ee1-b193-4680-9ee7-7c50284f5832', '考古学者ロビン', '歴史の本文を読み解く考古学者。', 'N', 'ONE PIECE', '/characters/robin/avatar.jpg', '/characters/robin/avatar.jpg', 'standard', 'memory'),
('gc-robin-r-01', '303a3ee1-b193-4680-9ee7-7c50284f5832', 'ハナハナの実', '花のように咲く無数の手。ロビンの能力。', 'R', 'ONE PIECE', '/characters/robin/avatar.jpg', '/characters/robin/avatar.jpg', 'standard', 'memory'),
('gc-robin-sr-01', '303a3ee1-b193-4680-9ee7-7c50284f5832', '「生きたい」', 'エニエス・ロビーでの叫び。仲間を信じた瞬間。', 'SR', 'ONE PIECE', '/characters/robin/avatar.jpg', '/characters/robin/avatar.jpg', 'standard', 'scene'),
('gc-robin-ssr-01', '303a3ee1-b193-4680-9ee7-7c50284f5832', '悪魔咲き 大飛翼', '巨大な翼を形成するロビンの大技。', 'SSR', 'ONE PIECE', '/characters/robin/avatar.jpg', '/characters/robin/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- シャンクス N/R/SR/SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-shanks-n-01', '85cd8482-825e-4a93-b3ab-b063f2a06abe', '赤髪海賊団', '東の海を旅するシャンクス。', 'N', 'ONE PIECE', '/characters/shanks/avatar.jpg', '/characters/shanks/avatar.jpg', 'standard', 'memory'),
('gc-shanks-r-01', '85cd8482-825e-4a93-b3ab-b063f2a06abe', '腕を賭けた男', 'ルフィを救うために腕を失ったシャンクス。', 'R', 'ONE PIECE', '/characters/shanks/avatar.jpg', '/characters/shanks/avatar.jpg', 'standard', 'memory'),
('gc-shanks-sr-01', '85cd8482-825e-4a93-b3ab-b063f2a06abe', '四皇シャンクス', '新世界に君臨する四皇の一人。', 'SR', 'ONE PIECE', '/characters/shanks/avatar.jpg', '/characters/shanks/avatar.jpg', 'standard', 'scene'),
('gc-shanks-ssr-01', '85cd8482-825e-4a93-b3ab-b063f2a06abe', '覇王色の威圧', '視線だけで海軍を止める。最強の覇王色。', 'SSR', 'ONE PIECE', '/characters/shanks/avatar.jpg', '/characters/shanks/avatar.jpg', 'gold', 'scene'),
('gc-shanks-ur-01', '85cd8482-825e-4a93-b3ab-b063f2a06abe', '新時代への賭け', '麦わら帽子に込めた想い。次の海賊王への期待。', 'UR', 'ONE PIECE', '/characters/shanks/avatar.jpg', '/characters/shanks/avatar.jpg', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ハンコック N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-hancock-n-01', '9406b055-8f6c-432a-93a9-097c1b302c06', '蛇姫', 'アマゾン・リリーの皇帝。', 'N', 'ONE PIECE', '/characters/hancock/avatar.jpg', '/characters/hancock/avatar.jpg', 'standard', 'memory'),
('gc-hancock-r-01', '9406b055-8f6c-432a-93a9-097c1b302c06', 'メロメロの実', '見惚れた者を石化させる絶世の美女。', 'R', 'ONE PIECE', '/characters/hancock/avatar.jpg', '/characters/hancock/avatar.jpg', 'standard', 'memory'),
('gc-hancock-sr-01', '9406b055-8f6c-432a-93a9-097c1b302c06', '七武海ハンコック', '王下七武海の座に就くハンコック。', 'SR', 'ONE PIECE', '/characters/hancock/avatar.jpg', '/characters/hancock/avatar.jpg', 'standard', 'scene'),
('gc-hancock-ssr-01', '9406b055-8f6c-432a-93a9-097c1b302c06', '恋はいつもハリケーン', 'ルフィへの純粋な恋心。最強の愛。', 'SSR', 'ONE PIECE', '/characters/hancock/avatar.jpg', '/characters/hancock/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ロー N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-law-n-01', 'law-character-2026030100000001', '死の外科医', '北の海出身の海賊医。', 'N', 'ONE PIECE', '/characters/law/avatar.jpg', '/characters/law/avatar.jpg', 'standard', 'memory'),
('gc-law-r-01', 'law-character-2026030100000001', 'ROOM展開', 'オペオペの実の空間操作。', 'R', 'ONE PIECE', '/characters/law/avatar.jpg', '/characters/law/avatar.jpg', 'standard', 'memory'),
('gc-law-sr-01', 'law-character-2026030100000001', '最悪の世代', 'ルフィと共に四皇に挑む同盟。', 'SR', 'ONE PIECE', '/characters/law/avatar.jpg', '/characters/law/avatar.jpg', 'standard', 'scene'),
('gc-law-ssr-01', 'law-character-2026030100000001', '不滅のROOM', 'コラソンの想いを継ぐ最終技。', 'SSR', 'ONE PIECE', '/characters/law/avatar.jpg', '/characters/law/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ===== 鬼滅の刃 カード =====

-- 炭治郎 N/R/SR/SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-tanjiro-n-01', 'tanjiro-character-2026030400000001', '炭焼きの少年', '優しい心を持つ炭焼き一家の長男。', 'N', '鬼滅の刃', '/characters/tanjiro/avatar.jpg', '/characters/tanjiro/avatar.jpg', 'standard', 'memory'),
('gc-tanjiro-r-01', 'tanjiro-character-2026030400000001', '水の呼吸', '鱗滝左近次から学んだ剣術。水面斬り。', 'R', '鬼滅の刃', '/characters/tanjiro/avatar.jpg', '/characters/tanjiro/avatar.jpg', 'standard', 'memory'),
('gc-tanjiro-sr-01', 'tanjiro-character-2026030400000001', 'ヒノカミ神楽', '父から受け継いだ日の呼吸の型。', 'SR', '鬼滅の刃', '/characters/tanjiro/avatar.jpg', '/characters/tanjiro/avatar.jpg', 'standard', 'scene'),
('gc-tanjiro-ssr-01', 'tanjiro-character-2026030400000001', '赫刀 日輪刀', '刀身を赤く染める覚醒。鬼殺隊最強の一振り。', 'SSR', '鬼滅の刃', '/characters/tanjiro/avatar.jpg', '/characters/tanjiro/avatar.jpg', 'gold', 'scene'),
('gc-tanjiro-ur-01', 'tanjiro-character-2026030400000001', '鬼舞辻無惨討伐', '全ての鬼を救い、家族の仇を討つ。終わりなき戦いの果て。', 'UR', '鬼滅の刃', '/characters/tanjiro/avatar.jpg', '/characters/tanjiro/avatar.jpg', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 禰豆子 N/R/SR/SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-nezuko-n-01', 'nezuko-character-2026030400000001', '箱の中の禰豆子', '日光を避けて箱の中で眠る禰豆子。', 'N', '鬼滅の刃', '/characters/nezuko/avatar.jpg', '/characters/nezuko/avatar.jpg', 'standard', 'memory'),
('gc-nezuko-r-01', 'nezuko-character-2026030400000001', '血鬼術 爆血', '自らの血を燃やす禰豆子の能力。', 'R', '鬼滅の刃', '/characters/nezuko/avatar.jpg', '/characters/nezuko/avatar.jpg', 'standard', 'memory'),
('gc-nezuko-sr-01', 'nezuko-character-2026030400000001', '太陽を克服した鬼', '唯一太陽光を克服した鬼。青い彼岸花の秘密。', 'SR', '鬼滅の刃', '/characters/nezuko/avatar.jpg', '/characters/nezuko/avatar.jpg', 'standard', 'scene'),
('gc-nezuko-ssr-01', 'nezuko-character-2026030400000001', '鬼化覚醒', '圧倒的な力を発揮する覚醒形態。', 'SSR', '鬼滅の刃', '/characters/nezuko/avatar.jpg', '/characters/nezuko/avatar.jpg', 'gold', 'scene'),
('gc-nezuko-ur-01', 'nezuko-character-2026030400000001', '人間に戻った禰豆子', '全ての試練を超え、ついに人間に戻った禰豆子。', 'UR', '鬼滅の刃', '/characters/nezuko/avatar.jpg', '/characters/nezuko/avatar.jpg', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 善逸 N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-zenitsu-n-01', 'zenitsu-character-2026030400000001', '泣き虫善逸', '怖がりだけど仲間思いの善逸。', 'N', '鬼滅の刃', '/characters/zenitsu/avatar.jpg', '/characters/zenitsu/avatar.jpg', 'standard', 'memory'),
('gc-zenitsu-r-01', 'zenitsu-character-2026030400000001', '雷の呼吸 壱ノ型', '一瞬の居合。霹靂一閃。', 'R', '鬼滅の刃', '/characters/zenitsu/avatar.jpg', '/characters/zenitsu/avatar.jpg', 'standard', 'memory'),
('gc-zenitsu-sr-01', 'zenitsu-character-2026030400000001', '霹靂一閃 六連', '6連続の神速斬撃。', 'SR', '鬼滅の刃', '/characters/zenitsu/avatar.jpg', '/characters/zenitsu/avatar.jpg', 'standard', 'scene'),
('gc-zenitsu-ssr-01', 'zenitsu-character-2026030400000001', '漆ノ型 火雷神', '善逸が独自に編み出した最強の型。', 'SSR', '鬼滅の刃', '/characters/zenitsu/avatar.jpg', '/characters/zenitsu/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 伊之助 N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-inosuke-n-01', 'inosuke-character-2026030400000001', '猪突猛進', '山育ちの野生児。猪の被り物。', 'N', '鬼滅の刃', '/characters/inosuke/avatar.jpg', '/characters/inosuke/avatar.jpg', 'standard', 'memory'),
('gc-inosuke-r-01', 'inosuke-character-2026030400000001', '獣の呼吸', '独学で編み出した我流の剣術。', 'R', '鬼滅の刃', '/characters/inosuke/avatar.jpg', '/characters/inosuke/avatar.jpg', 'standard', 'memory'),
('gc-inosuke-sr-01', 'inosuke-character-2026030400000001', '狂い裂き', '変幻自在の二刀流。刃こぼれさせた特殊な刀。', 'SR', '鬼滅の刃', '/characters/inosuke/avatar.jpg', '/characters/inosuke/avatar.jpg', 'standard', 'scene'),
('gc-inosuke-ssr-01', 'inosuke-character-2026030400000001', '山の王', '山中最強の野生の力。', 'SSR', '鬼滅の刃', '/characters/inosuke/avatar.jpg', '/characters/inosuke/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 義勇 N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-giyu-n-01', 'giyu-character-2026030400000001', '水柱・冨岡義勇', '寡黙な水柱。', 'N', '鬼滅の刃', '/characters/giyu/avatar.jpg', '/characters/giyu/avatar.jpg', 'standard', 'memory'),
('gc-giyu-r-01', 'giyu-character-2026030400000001', '拾壱ノ型 凪', '義勇だけが使える独自の型。無風の間合い。', 'R', '鬼滅の刃', '/characters/giyu/avatar.jpg', '/characters/giyu/avatar.jpg', 'standard', 'memory'),
('gc-giyu-sr-01', 'giyu-character-2026030400000001', '柱合会議', '鬼殺隊最高戦力の一人。禰豆子を庇う決意。', 'SR', '鬼滅の刃', '/characters/giyu/avatar.jpg', '/characters/giyu/avatar.jpg', 'standard', 'scene'),
('gc-giyu-ssr-01', 'giyu-character-2026030400000001', '錆兎との誓い', '親友の死を超え、真の水柱となる。', 'SSR', '鬼滅の刃', '/characters/giyu/avatar.jpg', '/characters/giyu/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ===== 呪術廻戦 カード =====

-- 五条悟 N/R/SR/SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-gojo-n-01', 'gojo-character-2026030400000001', '高専教師五条悟', '東京都立呪術高等専門学校の教師。', 'N', '呪術廻戦', '/characters/gojo/avatar.jpg', '/characters/gojo/avatar.jpg', 'standard', 'memory'),
('gc-gojo-r-01', 'gojo-character-2026030400000001', '無下限呪術', '原子レベルで空間を操る呪術。近づけない壁。', 'R', '呪術廻戦', '/characters/gojo/avatar.jpg', '/characters/gojo/avatar.jpg', 'standard', 'memory'),
('gc-gojo-sr-01', 'gojo-character-2026030400000001', '六眼の継承者', '呪力を完全に視る六眼。五条家の秘伝。', 'SR', '呪術廻戦', '/characters/gojo/avatar.jpg', '/characters/gojo/avatar.jpg', 'standard', 'scene'),
('gc-gojo-ssr-01', 'gojo-character-2026030400000001', '虚式・茈', '蒼と赫を合わせた最強の術式。存在しない力。', 'SSR', '呪術廻戦', '/characters/gojo/avatar.jpg', '/characters/gojo/avatar.jpg', 'gold', 'scene'),
('gc-gojo-ur-01', 'gojo-character-2026030400000001', '最強の呪術師', '「僕は最強だから」全てを超越した存在。', 'UR', '呪術廻戦', '/characters/gojo/avatar.jpg', '/characters/gojo/avatar.jpg', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 虎杖悠仁 N/R/SR/SSR/UR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-itadori-n-01', 'itadori-character-2026030400000001', '杉沢第三高校', '普通の高校生だった虎杖。異常な身体能力。', 'N', '呪術廻戦', '/characters/itadori/avatar.jpg', '/characters/itadori/avatar.jpg', 'standard', 'memory'),
('gc-itadori-r-01', 'itadori-character-2026030400000001', '宿儺の器', '両面宿儺の指を飲み込んだ器。共存する二つの魂。', 'R', '呪術廻戦', '/characters/itadori/avatar.jpg', '/characters/itadori/avatar.jpg', 'standard', 'memory'),
('gc-itadori-sr-01', 'itadori-character-2026030400000001', '黒閃', '呪力の核心に触れる一撃。0.000001秒の誤差。', 'SR', '呪術廻戦', '/characters/itadori/avatar.jpg', '/characters/itadori/avatar.jpg', 'standard', 'scene'),
('gc-itadori-ssr-01', 'itadori-character-2026030400000001', '逕庭拳', '時間差で呪力が到達する虎杖だけの体術。', 'SSR', '呪術廻戦', '/characters/itadori/avatar.jpg', '/characters/itadori/avatar.jpg', 'gold', 'scene'),
('gc-itadori-ur-01', 'itadori-character-2026030400000001', '正しい死の導き手', '全ての呪いの王を超え、人として生き続ける覚悟。', 'UR', '呪術廻戦', '/characters/itadori/avatar.jpg', '/characters/itadori/avatar.jpg', 'rainbow', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 伏黒恵 N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-fushiguro-n-01', 'fushiguro-character-2026030400000001', '禪院家の影', '十種影法術の使い手。', 'N', '呪術廻戦', '/characters/fushiguro/avatar.jpg', '/characters/fushiguro/avatar.jpg', 'standard', 'memory'),
('gc-fushiguro-r-01', 'fushiguro-character-2026030400000001', '玉犬', '影から呼び出す式神。伏黒の相棒。', 'R', '呪術廻戦', '/characters/fushiguro/avatar.jpg', '/characters/fushiguro/avatar.jpg', 'standard', 'memory'),
('gc-fushiguro-sr-01', 'fushiguro-character-2026030400000001', '嵌合暗翳庭', '領域展開。未完成ながら対領域に有効。', 'SR', '呪術廻戦', '/characters/fushiguro/avatar.jpg', '/characters/fushiguro/avatar.jpg', 'standard', 'scene'),
('gc-fushiguro-ssr-01', 'fushiguro-character-2026030400000001', '布瑠部由良由良 八握剣異戒神将 魔虚羅', '最強の式神。調伏不能の切り札。', 'SSR', '呪術廻戦', '/characters/fushiguro/avatar.jpg', '/characters/fushiguro/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 釘崎野薔薇 N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-nobara-n-01', 'nobara-character-2026030400000001', '田舎からの上京', '東京に憧れる芯の強い少女。', 'N', '呪術廻戦', '/characters/nobara/avatar.jpg', '/characters/nobara/avatar.jpg', 'standard', 'memory'),
('gc-nobara-r-01', 'nobara-character-2026030400000001', '芻霊呪法', '金槌と釘で呪力を打ち込む術式。', 'R', '呪術廻戦', '/characters/nobara/avatar.jpg', '/characters/nobara/avatar.jpg', 'standard', 'memory'),
('gc-nobara-sr-01', 'nobara-character-2026030400000001', '簪', '自分に釘を打ち込む最後の切り札。', 'SR', '呪術廻戦', '/characters/nobara/avatar.jpg', '/characters/nobara/avatar.jpg', 'standard', 'scene'),
('gc-nobara-ssr-01', 'nobara-character-2026030400000001', '黒閃到達', '遂に黒閃を決めた野薔薇。最高の瞬間。', 'SSR', '呪術廻戦', '/characters/nobara/avatar.jpg', '/characters/nobara/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- 禪院真希 N/R/SR/SSR
INSERT INTO "GachaCard" (id, "characterId", name, description, rarity, franchise, "cardImageUrl", "illustrationUrl", "frameType", category) VALUES
('gc-maki-n-01', 'maki-character-2026030400000001', '呪力ゼロの術師', '呪力を持たないが、呪具で戦う。', 'N', '呪術廻戦', '/characters/maki/avatar.jpg', '/characters/maki/avatar.jpg', 'standard', 'memory'),
('gc-maki-r-01', 'maki-character-2026030400000001', '呪具使い', '特級呪具・游雲を振るう真希。', 'R', '呪術廻戦', '/characters/maki/avatar.jpg', '/characters/maki/avatar.jpg', 'standard', 'memory'),
('gc-maki-sr-01', 'maki-character-2026030400000001', '禪院家殲滅', '天与呪縛の覚醒。フィジカルギフテッド。', 'SR', '呪術廻戦', '/characters/maki/avatar.jpg', '/characters/maki/avatar.jpg', 'standard', 'scene'),
('gc-maki-ssr-01', 'maki-character-2026030400000001', '甚爾を超えた身体', '禪院甚爾と同等以上の天与呪縛の完成形。', 'SSR', '呪術廻戦', '/characters/maki/avatar.jpg', '/characters/maki/avatar.jpg', 'gold', 'scene')
ON CONFLICT (id) DO NOTHING;

-- ===== バナーとカードの紐付け（rateUp更新） =====
-- ONE PIECE バナー: エース/シャンクスをレートアップ
UPDATE "GachaBanner" SET "rateUp" = '{"gc-ace-ssr-01": 3.0, "gc-shanks-ssr-01": 3.0, "gc-luffy-ur-01": 0.5}'::jsonb WHERE id = 'banner-straw-hat-2026-03';

-- 鬼滅バナー: 炭治郎/禰豆子レートアップ
UPDATE "GachaBanner" SET "rateUp" = '{"gc-tanjiro-ssr-01": 3.0, "gc-nezuko-ssr-01": 3.0, "gc-tanjiro-ur-01": 0.5}'::jsonb WHERE id = 'banner-kimetsu-2026-03';

-- 呪術廻戦バナー: 五条/虎杖レートアップ
UPDATE "GachaBanner" SET "rateUp" = '{"gc-gojo-ssr-01": 3.0, "gc-itadori-ssr-01": 3.0, "gc-gojo-ur-01": 0.5}'::jsonb WHERE id = 'banner-jjk-2026-03';
