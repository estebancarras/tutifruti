==> Running 'node server.js'
🚀 Configurando servidor para entorno de producción (sin MongoDB)
📊 Usando configuración robusta de sesiones en memoria
Warning: connect.session() MemoryStore is not
designed for a production environment, as it will leak
memory, and will not scale past a single process.
Servidor escuchando en:
- Local: http://localhost:3000
- Red: http://192.168.1.XXX:3000
Usa 'ipconfig' (Windows) o 'ifconfig' (Mac/Linux) para ver tu IP local
🔌 [SOCKET] Nuevo cliente conectado: JpzS0uXACyzQtDaOAAAB
🔌 [SOCKET] Headers: {
  host: 'tutifruti-3ii6.onrender.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*',
  'accept-encoding': 'gzip, br',
  'accept-language': 'es-ES,es;q=0.9',
  'cdn-loop': 'cloudflare; loops=1',
  'cf-connecting-ip': '191.118.16.191',
  'cf-ipcountry': 'CL',
  'cf-ray': '9798587e8e63b52e-PDX',
  'cf-visitor': '{"scheme":"https"}',
  cookie: 'tutifruti.sid=s%3AP__j7hBBspjhPzUHjD0UKJI2UNFOtHe2.ZcLq24uShyUDCAJOPDkGF0BryPSeskNZDVbZydsTUKo',
  dnt: '1',
  priority: 'u=1, i',
  referer: 'https://tutifruti-3ii6.onrender.com/views/create-room.html',
  'render-proxy-ttl': '4',
  'rndr-id': 'd871a3a0-3a59-41b3',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'true-client-ip': '191.118.16.191',
  'x-forwarded-for': '191.118.16.191, 172.68.174.38, 10.229.243.129',
  'x-forwarded-proto': 'https',
  'x-request-start': '1756934998939055'
}
🔌 [SOCKET] Transport: polling
🔌 [CONNECTION] Nuevo cliente conectado: JpzS0uXACyzQtDaOAAAB
🔌 [CONNECTION] Transport usado: polling
🔌 [CONNECTION] Headers de conexión: [
  'host',               'user-agent',
  'accept',             'accept-encoding',
  'accept-language',    'cdn-loop',
  'cf-connecting-ip',   'cf-ipcountry',
  'cf-ray',             'cf-visitor',
  'cookie',             'dnt',
  'priority',           'referer',
  'render-proxy-ttl',   'rndr-id',
  'sec-ch-ua',          'sec-ch-ua-mobile',
  'sec-ch-ua-platform', 'sec-fetch-dest',
  'sec-fetch-mode',     'sec-fetch-site',
  'true-client-ip',     'x-forwarded-for',
  'x-forwarded-proto',  'x-request-start'
]
⚠️ [reconnectPlayer] Re-conexión inválida
{"ts":"2025-09-03T21:29:59.740Z","level":"warn","event":"reconnectPlayer","roomId":"avqxo9nyw","socketId":"JpzS0uXACyzQtDaOAAAB","message":"Re-conexión inválida","memoryUsage":{"rss":76615680,"heapTotal":21585920,"heapUsed":19678744,"external":20599798,"arrayBuffers":18299185}}
⚠️ [getRoomState] Sala no existe
{"ts":"2025-09-03T21:29:59.741Z","level":"warn","event":"getRoomState","roomId":"avqxo9nyw","socketId":"JpzS0uXACyzQtDaOAAAB","message":"Sala no existe","memoryUsage":{"rss":76615680,"heapTotal":21585920,"heapUsed":19690368,"external":20599838,"arrayBuffers":18299185}}
ℹ️ [createRoom] Sala creada
{"ts":"2025-09-03T21:30:01.466Z","level":"info","event":"createRoom","roomId":"l24fi0bz6","socketId":"JpzS0uXACyzQtDaOAAAB","message":"Sala creada","memoryUsage":{"rss":77139968,"heapTotal":21585920,"heapUsed":19333624,"external":20569164,"arrayBuffers":18268511},"roomName":"vxccvcx"}
🔌 [SOCKET] Nuevo cliente conectado: J6KtFAX28lR1ybDjAAAD
🔌 [SOCKET] Headers: {
  host: 'tutifruti-3ii6.onrender.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*',
  'accept-encoding': 'gzip, br',
  'accept-language': 'es-ES,es;q=0.9',
  'cdn-loop': 'cloudflare; loops=1',
  'cf-connecting-ip': '191.118.16.191',
  'cf-ipcountry': 'CL',
  'cf-ray': '979858d14b53e7ab-PDX',
  'cf-visitor': '{"scheme":"https"}',
  cookie: 'tutifruti.sid=s%3AG-3N9xUS1aglY6raKPL29_xoLd9YikxU.xsK8EoTXghJVPpVOUNBO960H0mFyCfGUqAa4zQEDvOw',
  priority: 'u=1, i',
  referer: 'https://tutifruti-3ii6.onrender.com/views/join-room.html',
  'render-proxy-ttl': '4',
  'rndr-id': 'dab990cf-7dd3-46d4',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'true-client-ip': '191.118.16.191',
  'x-forwarded-for': '191.118.16.191, 104.23.160.108, 10.229.243.129',
  'x-forwarded-proto': 'https',
  'x-request-start': '1756935012161983'
}
🔌 [SOCKET] Transport: polling
🔌 [CONNECTION] Nuevo cliente conectado: J6KtFAX28lR1ybDjAAAD
🔌 [CONNECTION] Transport usado: polling
🔌 [CONNECTION] Headers de conexión: [
  'host',             'user-agent',
  'accept',           'accept-encoding',
  'accept-language',  'cdn-loop',
  'cf-connecting-ip', 'cf-ipcountry',
  'cf-ray',           'cf-visitor',
  'cookie',           'priority',
  'referer',          'render-proxy-ttl',
  'rndr-id',          'sec-ch-ua',
  'sec-ch-ua-mobile', 'sec-ch-ua-platform',
  'sec-fetch-dest',   'sec-fetch-mode',
  'sec-fetch-site',   'true-client-ip',
  'x-forwarded-for',  'x-forwarded-proto',
  'x-request-start'
]
⚠️ [reconnectPlayer] Re-conexión inválida
{"ts":"2025-09-03T21:30:12.660Z","level":"warn","event":"reconnectPlayer","roomId":"avqxo9nyw","socketId":"J6KtFAX28lR1ybDjAAAD","message":"Re-conexión inválida","memoryUsage":{"rss":78188544,"heapTotal":21848064,"heapUsed":20289720,"external":20605765,"arrayBuffers":18305112}}
{"ts":"2025-09-03T21:30:12.915Z","level":"warn","event":"getRoomState","roomId":"avqxo9nyw","socketId":"J6KtFAX28lR1ybDjAAAD","message":"Sala no existe","memoryUsage":{"rss":78450688,"heapTotal":22110208,"heapUsed":19862992,"external":20570217,"arrayBuffers":18269564}}
⚠️ [getRoomState] Sala no existe
ℹ️ [joinRoom] Intento de unirse por ss
{"ts":"2025-09-03T21:30:15.518Z","level":"info","event":"joinRoom","roomId":"l24fi0bz6","socketId":"J6KtFAX28lR1ybDjAAAD","message":"Intento de unirse por ss","memoryUsage":{"rss":78581760,"heapTotal":22110208,"heapUsed":20024464,"external":20570330,"arrayBuffers":18269677}}
ℹ️ [joinRoom] ss unido
{"ts":"2025-09-03T21:30:15.518Z","level":"info","event":"joinRoom","roomId":"l24fi0bz6","socketId":"J6KtFAX28lR1ybDjAAAD","message":"ss unido","memoryUsage":{"rss":78581760,"heapTotal":22110208,"heapUsed":20048872,"external":20570330,"arrayBuffers":18269677}}
🔤 [LETTER STREAK] Nueva letra: V, Historial: [V]
ℹ️ [startGame] Juego iniciado con letra V
{"ts":"2025-09-03T21:30:19.198Z","level":"info","event":"startGame","roomId":"l24fi0bz6","socketId":"JpzS0uXACyzQtDaOAAAB","message":"Juego iniciado con letra V","memoryUsage":{"rss":78712832,"heapTotal":22372352,"heapUsed":20127288,"external":20570356,"arrayBuffers":18269703}}
ℹ️ [disconnect] Cliente desconectado (período de gracia iniciado)
{"ts":"2025-09-03T21:30:19.779Z","level":"info","event":"disconnect","roomId":"l24fi0bz6","socketId":"JpzS0uXACyzQtDaOAAAB","message":"Cliente desconectado (período de gracia iniciado)","memoryUsage":{"rss":78712832,"heapTotal":22372352,"heapUsed":20310176,"external":20669253,"arrayBuffers":18368600}}
🔌 [SOCKET] Nuevo cliente conectado: qhI-9sON_82LvNsXAAAF
🔌 [SOCKET] Headers: {
  host: 'tutifruti-3ii6.onrender.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*',
  'accept-encoding': 'gzip, br',
  'accept-language': 'es-ES,es;q=0.9',
  'cdn-loop': 'cloudflare; loops=1',
  'cf-connecting-ip': '191.118.16.191',
  'cf-ipcountry': 'CL',
  'cf-ray': '9798590a0824b52e-SCL',
  'cf-visitor': '{"scheme":"https"}',
  cookie: 'tutifruti.sid=s%3AP__j7hBBspjhPzUHjD0UKJI2UNFOtHe2.ZcLq24uShyUDCAJOPDkGF0BryPSeskNZDVbZydsTUKo',
  dnt: '1',
  priority: 'u=1, i',
  referer: 'https://tutifruti-3ii6.onrender.com/views/game.html?roomId=l24fi0bz6',
  'render-proxy-ttl': '4',
  'rndr-id': 'aa1208d0-1714-40d3',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'true-client-ip': '191.118.16.191',
  'x-forwarded-for': '191.118.16.191, 104.23.202.228, 10.229.243.129',
  'x-forwarded-proto': 'https',
  'x-request-start': '1756935021231597'
}
🔌 [SOCKET] Transport: polling
🔌 [CONNECTION] Nuevo cliente conectado: qhI-9sON_82LvNsXAAAF
🔌 [CONNECTION] Transport usado: polling
🔌 [CONNECTION] Headers de conexión: [
  'host',               'user-agent',
  'accept',             'accept-encoding',
  'accept-language',    'cdn-loop',
  'cf-connecting-ip',   'cf-ipcountry',
  'cf-ray',             'cf-visitor',
  'cookie',             'dnt',
  'priority',           'referer',
  'render-proxy-ttl',   'rndr-id',
  'sec-ch-ua',          'sec-ch-ua-mobile',
  'sec-ch-ua-platform', 'sec-fetch-dest',
  'sec-fetch-mode',     'sec-fetch-site',
  'true-client-ip',     'x-forwarded-for',
  'x-forwarded-proto',  'x-request-start'
]
ℹ️ [reconnectPlayer] Re-conectado y estado enviado
{"ts":"2025-09-03T21:30:21.807Z","level":"info","event":"reconnectPlayer","roomId":"l24fi0bz6","socketId":"qhI-9sON_82LvNsXAAAF","message":"Re-conectado y estado enviado","memoryUsage":{"rss":79106048,"heapTotal":22634496,"heapUsed":20550640,"external":20588034,"arrayBuffers":18287381}}
ℹ️ [disconnect] Cliente desconectado (período de gracia iniciado)
{"ts":"2025-09-03T21:30:21.938Z","level":"info","event":"disconnect","roomId":"l24fi0bz6","socketId":"J6KtFAX28lR1ybDjAAAD","message":"Cliente desconectado (período de gracia iniciado)","memoryUsage":{"rss":79106048,"heapTotal":22634496,"heapUsed":20603056,"external":20588042,"arrayBuffers":18287389}}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:30:22.040Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"qhI-9sON_82LvNsXAAAF","message":"Estado de sala enviado","memoryUsage":{"rss":79106048,"heapTotal":22634496,"heapUsed":20795024,"external":20605589,"arrayBuffers":18304936}}
🔌 [SOCKET] Nuevo cliente conectado: PXrkmGP-RgRZfymSAAAH
🔌 [SOCKET] Headers: {
  host: 'tutifruti-3ii6.onrender.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*',
  'accept-encoding': 'gzip, br',
  'accept-language': 'es-ES,es;q=0.9',
  'cdn-loop': 'cloudflare; loops=1',
  'cf-connecting-ip': '191.118.16.191',
  'cf-ipcountry': 'CL',
  'cf-ray': '97985915d91de7ab-PDX',
  'cf-visitor': '{"scheme":"https"}',
  cookie: 'tutifruti.sid=s%3AG-3N9xUS1aglY6raKPL29_xoLd9YikxU.xsK8EoTXghJVPpVOUNBO960H0mFyCfGUqAa4zQEDvOw',
  priority: 'u=1, i',
  referer: 'https://tutifruti-3ii6.onrender.com/views/game.html?roomId=l24fi0bz6',
  'render-proxy-ttl': '4',
  'rndr-id': 'f1659532-0972-4c26',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'true-client-ip': '191.118.16.191',
  'x-forwarded-for': '191.118.16.191, 172.68.174.12, 10.229.154.3',
  'x-forwarded-proto': 'https',
  'x-request-start': '1756935023127540'
}
🔌 [SOCKET] Transport: polling
🔌 [CONNECTION] Nuevo cliente conectado: PXrkmGP-RgRZfymSAAAH
🔌 [CONNECTION] Transport usado: polling
🔌 [CONNECTION] Headers de conexión: [
  'host',             'user-agent',
  'accept',           'accept-encoding',
  'accept-language',  'cdn-loop',
  'cf-connecting-ip', 'cf-ipcountry',
  'cf-ray',           'cf-visitor',
  'cookie',           'priority',
  'referer',          'render-proxy-ttl',
  'rndr-id',          'sec-ch-ua',
  'sec-ch-ua-mobile', 'sec-ch-ua-platform',
  'sec-fetch-dest',   'sec-fetch-mode',
  'sec-fetch-site',   'true-client-ip',
  'x-forwarded-for',  'x-forwarded-proto',
  'x-request-start'
]
ℹ️ [reconnectPlayer] Re-conectado y estado enviado
{"ts":"2025-09-03T21:30:23.865Z","level":"info","event":"reconnectPlayer","roomId":"l24fi0bz6","socketId":"PXrkmGP-RgRZfymSAAAH","message":"Re-conectado y estado enviado","memoryUsage":{"rss":79589376,"heapTotal":22634496,"heapUsed":20990912,"external":20588788,"arrayBuffers":18288135}}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:30:24.105Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"PXrkmGP-RgRZfymSAAAH","message":"Estado de sala enviado","memoryUsage":{"rss":79589376,"heapTotal":22634496,"heapUsed":21033144,"external":20588836,"arrayBuffers":18288183}}
ℹ️ [submitWords] ss envió sus palabras
{"ts":"2025-09-03T21:31:00.005Z","level":"info","event":"submitWords","roomId":"l24fi0bz6","socketId":"PXrkmGP-RgRZfymSAAAH","message":"ss envió sus palabras","memoryUsage":{"rss":79589376,"heapTotal":22896640,"heapUsed":21127144,"external":20577660,"arrayBuffers":18277007}}
🔍 [DEBUG] Sala l24fi0bz6 en revisión: { players: 2, connected: 2, isPlaying: true, roundPhase: 'review' }
ℹ️ [startReview] Iniciada revisión para ronda 1
{"ts":"2025-09-03T21:31:01.118Z","level":"info","event":"startReview","roomId":"l24fi0bz6","message":"Iniciada revisión para ronda 1","memoryUsage":{"rss":79589376,"heapTotal":22896640,"heapUsed":21179480,"external":20577902,"arrayBuffers":18277249}}
ℹ️ [submitWords] xzcgfg envió sus palabras
{"ts":"2025-09-03T21:31:01.118Z","level":"info","event":"submitWords","roomId":"l24fi0bz6","socketId":"qhI-9sON_82LvNsXAAAF","message":"xzcgfg envió sus palabras","memoryUsage":{"rss":79589376,"heapTotal":22896640,"heapUsed":21182400,"external":20577902,"arrayBuffers":18277249}}
ℹ️ [disconnect] Cliente desconectado (período de gracia iniciado)
{"ts":"2025-09-03T21:31:06.235Z","level":"info","event":"disconnect","roomId":"l24fi0bz6","socketId":"qhI-9sON_82LvNsXAAAF","message":"Cliente desconectado (período de gracia iniciado)","memoryUsage":{"rss":79589376,"heapTotal":22896640,"heapUsed":21202872,"external":20577902,"arrayBuffers":18277249}}
ℹ️ [disconnect] Cliente desconectado (período de gracia iniciado)
{"ts":"2025-09-03T21:31:08.131Z","level":"info","event":"disconnect","roomId":"l24fi0bz6","socketId":"PXrkmGP-RgRZfymSAAAH","message":"Cliente desconectado (período de gracia iniciado)","memoryUsage":{"rss":79720448,"heapTotal":22896640,"heapUsed":21241864,"external":20577908,"arrayBuffers":18277255}}
🔌 [SOCKET] Nuevo cliente conectado: K2-1bwn_F5tn_hf8AAAJ
🔌 [SOCKET] Headers: {
  host: 'tutifruti-3ii6.onrender.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*',
  'accept-encoding': 'gzip, br',
  'accept-language': 'es-ES,es;q=0.9',
  'cdn-loop': 'cloudflare; loops=1',
  'cf-connecting-ip': '191.118.16.191',
  'cf-ipcountry': 'CL',
  'cf-ray': '97985a339c65e9a2-SCL',
  'cf-visitor': '{"scheme":"https"}',
  cookie: 'tutifruti.sid=s%3AP__j7hBBspjhPzUHjD0UKJI2UNFOtHe2.ZcLq24uShyUDCAJOPDkGF0BryPSeskNZDVbZydsTUKo',
  dnt: '1',
  priority: 'u=1, i',
  referer: 'https://tutifruti-3ii6.onrender.com/views/game.html?roomId=l24fi0bz6',
  'render-proxy-ttl': '4',
  'rndr-id': '2a28d482-bbc6-492a',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'true-client-ip': '191.118.16.191',
  'x-forwarded-for': '191.118.16.191, 104.23.202.228, 10.229.243.129',
  'x-forwarded-proto': 'https',
  'x-request-start': '1756935068862619'
}
🔌 [SOCKET] Transport: polling
🔌 [CONNECTION] Nuevo cliente conectado: K2-1bwn_F5tn_hf8AAAJ
🔌 [CONNECTION] Transport usado: polling
🔌 [CONNECTION] Headers de conexión: [
  'host',               'user-agent',
  'accept',             'accept-encoding',
  'accept-language',    'cdn-loop',
  'cf-connecting-ip',   'cf-ipcountry',
  'cf-ray',             'cf-visitor',
  'cookie',             'dnt',
  'priority',           'referer',
  'render-proxy-ttl',   'rndr-id',
  'sec-ch-ua',          'sec-ch-ua-mobile',
  'sec-ch-ua-platform', 'sec-fetch-dest',
  'sec-fetch-mode',     'sec-fetch-site',
  'true-client-ip',     'x-forwarded-for',
  'x-forwarded-proto',  'x-request-start'
]
ℹ️ [reconnectPlayer] Re-conectado y estado enviado
{"ts":"2025-09-03T21:31:09.413Z","level":"info","event":"reconnectPlayer","roomId":"l24fi0bz6","socketId":"K2-1bwn_F5tn_hf8AAAJ","message":"Re-conectado y estado enviado","memoryUsage":{"rss":79851520,"heapTotal":22896640,"heapUsed":21499944,"external":20578068,"arrayBuffers":18277415}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:09.414Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"K2-1bwn_F5tn_hf8AAAJ","message":"Estado de sala enviado","memoryUsage":{"rss":79851520,"heapTotal":22896640,"heapUsed":21526592,"external":20578068,"arrayBuffers":18277415}}
ℹ️ [reconnectPlayer] Re-conectado y estado enviado
{"ts":"2025-09-03T21:31:09.913Z","level":"info","event":"reconnectPlayer","roomId":"l24fi0bz6","socketId":"K2-1bwn_F5tn_hf8AAAJ","message":"Re-conectado y estado enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":20943232,"external":20594949,"arrayBuffers":18294296}}
🔌 [SOCKET] Nuevo cliente conectado: Z17oCyiyCaJZe2YOAAAL
🔌 [SOCKET] Headers: {
  host: 'tutifruti-3ii6.onrender.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  accept: '*/*',
  'accept-encoding': 'gzip, br',
  'accept-language': 'es-ES,es;q=0.9',
  'cdn-loop': 'cloudflare; loops=1',
  'cf-connecting-ip': '191.118.16.191',
  'cf-ipcountry': 'CL',
  'cf-ray': '97985a36cc47e7ad-SCL',
  'cf-visitor': '{"scheme":"https"}',
  cookie: 'tutifruti.sid=s%3AG-3N9xUS1aglY6raKPL29_xoLd9YikxU.xsK8EoTXghJVPpVOUNBO960H0mFyCfGUqAa4zQEDvOw',
  priority: 'u=1, i',
  referer: 'https://tutifruti-3ii6.onrender.com/views/game.html?roomId=l24fi0bz6',
  'render-proxy-ttl': '4',
  'rndr-id': 'b54f3362-c8f5-4591',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'true-client-ip': '191.118.16.191',
  'x-forwarded-for': '191.118.16.191, 104.23.202.230, 10.229.154.3',
  'x-forwarded-proto': 'https',
  'x-request-start': '1756935069713877'
}
🔌 [SOCKET] Transport: polling
🔌 [CONNECTION] Nuevo cliente conectado: Z17oCyiyCaJZe2YOAAAL
🔌 [CONNECTION] Transport usado: polling
🔌 [CONNECTION] Headers de conexión: [
  'host',             'user-agent',
  'accept',           'accept-encoding',
  'accept-language',  'cdn-loop',
  'cf-connecting-ip', 'cf-ipcountry',
  'cf-ray',           'cf-visitor',
  'cookie',           'priority',
  'referer',          'render-proxy-ttl',
  'rndr-id',          'sec-ch-ua',
  'sec-ch-ua-mobile', 'sec-ch-ua-platform',
  'sec-fetch-dest',   'sec-fetch-mode',
  'sec-fetch-site',   'true-client-ip',
  'x-forwarded-for',  'x-forwarded-proto',
  'x-request-start'
]
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:10.157Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"K2-1bwn_F5tn_hf8AAAJ","message":"Estado de sala enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21103464,"external":20595121,"arrayBuffers":18294468}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:10.157Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"K2-1bwn_F5tn_hf8AAAJ","message":"Estado de sala enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21124152,"external":20595121,"arrayBuffers":18294468}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:10.157Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"K2-1bwn_F5tn_hf8AAAJ","message":"Estado de sala enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21144640,"external":20595121,"arrayBuffers":18294468}}
ℹ️ [reconnectPlayer] Re-conectado y estado enviado
{"ts":"2025-09-03T21:31:10.618Z","level":"info","event":"reconnectPlayer","roomId":"l24fi0bz6","socketId":"Z17oCyiyCaJZe2YOAAAL","message":"Re-conectado y estado enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21261400,"external":20596215,"arrayBuffers":18295562}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:10.873Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"Z17oCyiyCaJZe2YOAAAL","message":"Estado de sala enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21327112,"external":20596380,"arrayBuffers":18295727}}
ℹ️ [reconnectPlayer] Re-conectado y estado enviado
{"ts":"2025-09-03T21:31:10.873Z","level":"info","event":"reconnectPlayer","roomId":"l24fi0bz6","socketId":"Z17oCyiyCaJZe2YOAAAL","message":"Re-conectado y estado enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21334256,"external":20596380,"arrayBuffers":18295727}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:10.873Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"Z17oCyiyCaJZe2YOAAAL","message":"Estado de sala enviado","memoryUsage":{"rss":80113664,"heapTotal":22896640,"heapUsed":21354920,"external":20596380,"arrayBuffers":18295727}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:11.177Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"Z17oCyiyCaJZe2YOAAAL","message":"Estado de sala enviado","memoryUsage":{"rss":80375808,"heapTotal":22896640,"heapUsed":21447864,"external":20621065,"arrayBuffers":18320412}}
📊 [getRoomState] Enviando datos de revisión: {
  roomId: 'l24fi0bz6',
  playersCount: 2,
  reviewData: true,
  words: [ 'xzcgfg', 'ss' ],
  categories: 12
}
ℹ️ [getRoomState] Estado de sala enviado
{"ts":"2025-09-03T21:31:11.178Z","level":"info","event":"getRoomState","roomId":"l24fi0bz6","socketId":"Z17oCyiyCaJZe2YOAAAL","message":"Estado de sala enviado","memoryUsage":{"rss":80375808,"heapTotal":22896640,"heapUsed":21468944,"external":20621065,"arrayBuffers":18320412}}
Need 