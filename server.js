import fs from 'fs'
import express from 'express'
import Router from 'express-promise-router'
import { Server } from 'socket.io'
import cors from 'cors'

// Create router
const router = Router()

// Main route serves the index HTML
router.get('/', async (req, res, next) => {
    let html = fs.readFileSync('index.html', 'utf-8')
    res.send(html)
})

// Everything else that's not index 404s
router.use('*', (req, res) => {
    res.status(404).send({ message: 'Not Found' })
})


// Create express app and listen on port 4444
const app = express()
app.use(cors({
    origin: '*', // For production, restrict this to your Netlify domain
    methods: ['GET', 'POST'],
    credentials: true
}))
app.use(express.static('dist'))
app.use(router)
const server = app.listen(process.env.PORT || 4444, () => {
    console.log(`Listening on port http://localhost:4444...`)
})

const ioServer = new Server(server, {
    cors: {
        origin: '*', // For production, restrict this to your Netlify domain
        methods: ['GET', 'POST'],
        credentials: true
    }
})

let clients = {}

// Socket app msgs
ioServer.on('connection', (client) => {
    console.log(
        `User ${client.id} connected, Total: ${ioServer.engine.clientsCount} users connected`
    )

    //Add a new client indexed by their id
    clients[client.id] = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
    }

    ioServer.sockets.emit('move', clients)

    client.on('move', ({ id, rotation, position }) => {
        clients[id].position = position
        clients[id].rotation = rotation

        ioServer.sockets.emit('move', clients)
    })

    client.on('disconnect', () => {
        console.log(
            `User ${client.id} disconnected, there are currently ${ioServer.engine.clientsCount} users connected`
        )

        //Delete ttheir client from the object
        delete clients[client.id]

        ioServer.sockets.emit('move', clients)
    })
})
