import crypto from 'crypto'
import fs from 'fs'
import net from 'net'
import os from 'os'

/**
 *
 * @param {*} socketPath
 * @param {*} resolve
 * @param {*} reject
 */
function createInstanceSock(socketPath, resolve, reject) {
    const sock = net.createServer()

    sock.listen(socketPath, () => {
        process.on('exit', () => {
            if (fs.existsSync(socketPath)) {
                fs.unlinkSync(socketPath)
            }
        })
        resolve(socketPath)
    })

    sock.on('error', () => {
        reject('CANNOT_INSTANTINATE')
    })
}

/**
 *
 * @param {*} socketPath
 * @param {*} resolve
 * @param {*} reject
 */
function connectToInstance(socketPath, resolve, reject) {
    const socketServer = net.createConnection(socketPath)

    socketServer.on('connect', () => {
        reject('ALREADY_RUNNING')
    })

    socketServer.on('error', (err) => {
        fs.unlinkSync(socketPath)
        resolve(socketPath)
    })
}

/**
 * @returns {Promise}
 */
export default function singleInstanceLock(id) {
    // Calculate hash depending on version, runtime, user... So we won't
    // accidentally prevent launch when there are multiple users running program.
    const hash = crypto
        .createHash('sha1')
        .update(id)
        .update(os.userInfo().username.toString())
        .digest('base64')
        .replace(/(\+|=|\/)/g, '')
        .substr(0, 8)

    // Socket filename.
    const socketName =
        `${id}-${hash}`
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9-.]/g, '') + '.sock'

    // Socket filepath.
    const socketPath = process.platform === 'win32' ? `\\\\.\\pipe\\${socketName}` : `${os.tmpdir()}/${socketName}`

    return new Promise(function (resolve, reject) {
        if (fs.existsSync(socketPath)) {
            connectToInstance(socketPath, () => createInstanceSock(socketPath, resolve, reject), reject)
        } else {
            createInstanceSock(socketPath, resolve, reject)
        }
    })
}