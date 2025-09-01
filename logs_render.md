2025-09-01T20:00:32.102640951Z {"ts":"2025-09-01T20:00:32.102Z","level":"info","event":"createRoom","roomId":"ek2ttztrq","socketId":"xwHrBfXMecI0yVtiAAAL","message":"Sala creada","roomName":"saaaaa32"}
2025-09-01T20:00:39.535609179Z {"ts":"2025-09-01T20:00:39.535Z","level":"info","event":"joinRoom","roomId":"ek2ttztrq","socketId":"bl3Ct9o5oVzqlyypAAAJ","message":"Intento de unirse por aasdasddsad"}
2025-09-01T20:00:39.536141101Z {"ts":"2025-09-01T20:00:39.536Z","level":"info","event":"joinRoom","roomId":"ek2ttztrq","socketId":"bl3Ct9o5oVzqlyypAAAJ","message":"aasdasddsad unido"}
2025-09-01T20:00:39.841458742Z /opt/render/project/src/node_modules/mongodb/lib/sdam/topology.js:326
2025-09-01T20:00:39.841486762Z                 const timeoutError = new error_1.MongoServerSelectionError(`Server selection timed out after ${timeout?.duration} ms`, this.description);
2025-09-01T20:00:39.841495642Z                                      ^
2025-09-01T20:00:39.841499512Z 
2025-09-01T20:00:39.841504323Z MongoServerSelectionError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
2025-09-01T20:00:39.841510583Z     at Topology.selectServer (/opt/render/project/src/node_modules/mongodb/lib/sdam/topology.js:326:38)
2025-09-01T20:00:39.841514893Z     at async Topology._connect (/opt/render/project/src/node_modules/mongodb/lib/sdam/topology.js:200:28)
2025-09-01T20:00:39.841519303Z     at async Topology.connect (/opt/render/project/src/node_modules/mongodb/lib/sdam/topology.js:152:13)
2025-09-01T20:00:39.841523383Z     at async topologyConnect (/opt/render/project/src/node_modules/mongodb/lib/mongo_client.js:258:17)
2025-09-01T20:00:39.841527703Z     at async MongoClient._connect (/opt/render/project/src/node_modules/mongodb/lib/mongo_client.js:271:13)
2025-09-01T20:00:39.841531613Z     at async MongoClient.connect (/opt/render/project/src/node_modules/mongodb/lib/mongo_client.js:196:13)
2025-09-01T20:00:39.841535913Z     at async MongoClient.connect (/opt/render/project/src/node_modules/mongodb/lib/mongo_client.js:418:16) {
2025-09-01T20:00:39.841541923Z   errorLabelSet: Set(0) {},
2025-09-01T20:00:39.841546304Z   reason: TopologyDescription {
2025-09-01T20:00:39.841551453Z     type: 'Unknown',
2025-09-01T20:00:39.841555734Z     servers: Map(1) {
2025-09-01T20:00:39.841595354Z       'localhost:27017' => ServerDescription {
2025-09-01T20:00:39.841599645Z         address: 'localhost:27017',
2025-09-01T20:00:39.841602345Z         type: 'Unknown',
2025-09-01T20:00:39.841604915Z         hosts: [],
2025-09-01T20:00:39.841607225Z         passives: [],
2025-09-01T20:00:39.841609395Z         arbiters: [],
2025-09-01T20:00:39.841611905Z         tags: {},
2025-09-01T20:00:39.841614915Z         minWireVersion: 0,
2025-09-01T20:00:39.841617495Z         maxWireVersion: 0,
2025-09-01T20:00:39.841620185Z         roundTripTime: -1,
2025-09-01T20:00:39.841622795Z         minRoundTripTime: 0,
2025-09-01T20:00:39.841625325Z         lastUpdateTime: 3420470421,
2025-09-01T20:00:39.841628155Z         lastWriteDate: 0,
2025-09-01T20:00:39.841630765Z         error: MongoNetworkError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
2025-09-01T20:00:39.841633366Z             at Socket.<anonymous> (/opt/render/project/src/node_modules/mongodb/lib/cmap/connect.js:286:44)
2025-09-01T20:00:39.841638355Z             at Object.onceWrapper (node:events:633:26)
2025-09-01T20:00:39.841640716Z             at Socket.emit (node:events:518:28)
2025-09-01T20:00:39.841643336Z             at emitErrorNT (node:internal/streams/destroy:170:8)
2025-09-01T20:00:39.841646536Z             at emitErrorCloseNT (node:internal/streams/destroy:129:3)
2025-09-01T20:00:39.841649486Z             at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
2025-09-01T20:00:39.841651996Z           errorLabelSet: Set(1) { 'ResetPool' },
2025-09-01T20:00:39.841654976Z           beforeHandshake: false,
2025-09-01T20:00:39.841657696Z           [cause]: AggregateError [ECONNREFUSED]: 
2025-09-01T20:00:39.841660616Z               at internalConnectMultiple (node:net:1139:18)
2025-09-01T20:00:39.841663216Z               at afterConnectMultiple (node:net:1714:7) {
2025-09-01T20:00:39.841665736Z             code: 'ECONNREFUSED',
2025-09-01T20:00:39.841668216Z             [errors]: [Array]
2025-09-01T20:00:39.841670856Z           }
2025-09-01T20:00:39.841673256Z         },
2025-09-01T20:00:39.841676216Z         topologyVersion: null,
2025-09-01T20:00:39.841678796Z         setName: null,
2025-09-01T20:00:39.841681387Z         setVersion: null,
2025-09-01T20:00:39.841683967Z         electionId: null,
2025-09-01T20:00:39.841686337Z         logicalSessionTimeoutMinutes: null,
2025-09-01T20:00:39.841688367Z         maxMessageSizeBytes: null,
2025-09-01T20:00:39.841690517Z         maxWriteBatchSize: null,
2025-09-01T20:00:39.841692907Z         maxBsonObjectSize: null,
2025-09-01T20:00:39.841695437Z         primary: null,
2025-09-01T20:00:39.841698167Z         me: null,
2025-09-01T20:00:39.841700557Z         '$clusterTime': null,
2025-09-01T20:00:39.841703217Z         iscryptd: false
2025-09-01T20:00:39.841705867Z       }
2025-09-01T20:00:39.841708367Z     },
2025-09-01T20:00:39.841710917Z     stale: false,
2025-09-01T20:00:39.841713287Z     compatible: true,
2025-09-01T20:00:39.841715567Z     heartbeatFrequencyMS: 10000,
2025-09-01T20:00:39.841718037Z     localThresholdMS: 15,
2025-09-01T20:00:39.841720937Z     setName: null,
2025-09-01T20:00:39.841723437Z     maxElectionId: null,
2025-09-01T20:00:39.841726137Z     maxSetVersion: null,
2025-09-01T20:00:39.841728598Z     commonWireVersion: 0,
2025-09-01T20:00:39.841731418Z     logicalSessionTimeoutMinutes: null
2025-09-01T20:00:39.841733768Z   },
2025-09-01T20:00:39.841736608Z   code: undefined,
2025-09-01T20:00:39.841739258Z   [cause]: MongoNetworkError: connect ECONNREFUSED ::1:27017, connect ECONNREFUSED 127.0.0.1:27017
2025-09-01T20:00:39.841747708Z       at Socket.<anonymous> (/opt/render/project/src/node_modules/mongodb/lib/cmap/connect.js:286:44)
2025-09-01T20:00:39.841750348Z       at Object.onceWrapper (node:events:633:26)
2025-09-01T20:00:39.841752748Z       at Socket.emit (node:events:518:28)
2025-09-01T20:00:39.841755798Z       at emitErrorNT (node:internal/streams/destroy:170:8)
2025-09-01T20:00:39.841758298Z       at emitErrorCloseNT (node:internal/streams/destroy:129:3)
2025-09-01T20:00:39.841761148Z       at process.processTicksAndRejections (node:internal/process/task_queues:90:21) {
2025-09-01T20:00:39.841763758Z     errorLabelSet: Set(1) { 'ResetPool' },
2025-09-01T20:00:39.841766478Z     beforeHandshake: false,
2025-09-01T20:00:39.841769069Z     [cause]: AggregateError [ECONNREFUSED]: 
2025-09-01T20:00:39.841771709Z         at internalConnectMultiple (node:net:1139:18)
2025-09-01T20:00:39.841774039Z         at afterConnectMultiple (node:net:1714:7) {
2025-09-01T20:00:39.841776619Z       code: 'ECONNREFUSED',
2025-09-01T20:00:39.841779139Z       [errors]: [
2025-09-01T20:00:39.841781709Z         Error: connect ECONNREFUSED ::1:27017
2025-09-01T20:00:39.841784199Z             at createConnectionError (node:net:1677:14)
2025-09-01T20:00:39.841786479Z             at afterConnectMultiple (node:net:1707:16) {
2025-09-01T20:00:39.841788629Z           errno: -111,
2025-09-01T20:00:39.841791089Z           code: 'ECONNREFUSED',
2025-09-01T20:00:39.841793579Z           syscall: 'connect',
2025-09-01T20:00:39.841813959Z           address: '::1',
2025-09-01T20:00:39.84181756Z           port: 27017
2025-09-01T20:00:39.84182065Z         },
2025-09-01T20:00:39.8418233Z         Error: connect ECONNREFUSED 127.0.0.1:27017
2025-09-01T20:00:39.84182636Z             at createConnectionError (node:net:1677:14)
2025-09-01T20:00:39.84182907Z             at afterConnectMultiple (node:net:1707:16) {
2025-09-01T20:00:39.84183162Z           errno: -111,
2025-09-01T20:00:39.84183437Z           code: 'ECONNREFUSED',
2025-09-01T20:00:39.84183686Z           syscall: 'connect',
2025-09-01T20:00:39.84183945Z           address: '127.0.0.1',
2025-09-01T20:00:39.84184221Z           port: 27017
2025-09-01T20:00:39.84184445Z         }
2025-09-01T20:00:39.84184697Z       ]
2025-09-01T20:00:39.84184983Z     }
2025-09-01T20:00:39.84185288Z   }
2025-09-01T20:00:39.841855391Z }
2025-09-01T20:00:39.841857911Z 
2025-09-01T20:00:39.841860421Z Node.js v22.16.0