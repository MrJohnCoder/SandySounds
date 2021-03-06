const WebSocket = require('ws');
const axios = require('axios');

let EventEmitter;

try {
    EventEmitter = require('eventemitter3');
} catch (err) {
    EventEmitter = require('events').EventEmitter;
}

/**
 * @class Lavalink
 * @extends EventEmitter
 */
class Node extends EventEmitter {
    /**
	 * Lavalink constructor
	 * @param {Object} options Lavalink node options
	 * @param {string} options.host The hostname to connect to
     * @param {string} options.port The port to connect with
     * @param {string} options.region The region of the node
     * @param {number} options.numShards The number of shards the bot is running
     * @param {string} options.userId The user id of the bot
     * @param {string} options.password The password for the Lavalink node
	 * @param {number} [options.timeout=5000] Optional timeout in ms used for the reconnect backoff
	 */
    constructor(options) {
        super();

        this.host = options.host;
        this.port = options.port || 80;
        this.url = `${this.host}:${this.port}`;
        this.address = `ws://${this.host}:${this.port}`;
        this.restAddress = `http://${this.host}:${options.restPort}`;
        this.region = options.region || null;
        this.userId = options.userId;
        this.numShards = options.numShards;
        this.password = options.password || 'youshallnotpass';
        this.connected = false;
        this.draining = false;
        this.retries = 0;
        this.reconnectTimeout = options.timeout || 5000;
        this.reconnectInterval = null;
        this.stats = { players: 0, playingPlayers: 0 };
        this.disconnectHandler = this.disconnected.bind(this);

        this.connect();
    }

    /**
	 * Connect to the websocket server
	 * @private
	 */
    connect() {
        this.ws = new WebSocket(this.address, {
            headers: {
                'Authorization': this.password,
                'Num-Shards': this.numShards,
                'User-Id': this.userId,
            },
        });

        this.rest = axios.create({
            baseURL: this.restAddress,
            headers: {
                common: {
                    'Authorization': this.password
                }
            }
        });


        this.ws.on('open', this.ready.bind(this));
        this.ws.on('message', this.onMessage.bind(this));
        this.ws.on('close', this.disconnectHandler);
        this.ws.on('error', (err) => {
            this.emit('error', err);
        });
    }

    /**
	 * Reconnect to the websocket
	 * @private
	 */
    reconnect() {
        let interval = this.retryInterval();
        this.reconnectInterval = setTimeout(this.reconnect.bind(this), interval);
        this.retries++;
        this.connect();
    }

    /**
	 * Destroy the websocket connection
	 */
    destroy() {
        if (this.ws) {
            this.ws.removeListener('close', this.disconnectHandler);
            this.ws.close();
        }
    }

    /**
	 * Called when the websocket is open
	 * @private
	 */
    ready() {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        this.connected = true;
        this.retries = 0;
        this.emit('ready');
    }

    /**
	 * Called when the websocket disconnects
	 * @private
	 */
    disconnected() {
        this.connected = false;
        if (!this.reconnectInterval) {
            this.emit('disconnect');
        }

        delete this.ws;

        if (!this.reconnectInterval) {
            this.reconnectInterval = setTimeout(this.reconnect.bind(this), this.reconnectTimeout);
        }
    }

    /**
	 * Get the retry interval
	 * @private
	 */
    retryInterval() {
        let retries = Math.min(this.retries - 1, 5);
        return Math.pow(retries + 5, 2) * 1000;
    }

    /**
	 * Send data to Lavalink
	 * @param {string} op Op name
	 * @param {*} data Data to send
	 */
    send(data) {
        const ws = this.ws;
        if (!ws) return;

        let payload;

        try {
            payload = JSON.stringify(data);
        } catch (err) {
            return this.emit('error', 'Unable to stringify payload.');
        }

        ws.send(payload);
    }

    /**
	 * Handle message from the server
	 * @param {string} message Raw websocket message
	 * @private
	 */
    onMessage(message) {

        let data;

        try {
            data = JSON.parse(message);
        } catch (e) {
            return this.emit('error', 'Unable to parse ws message.');
        }

        if (data.op && data.op === 'stats') {
            this.stats = data;
        }

        this.emit('message', data);
    }

    async resolveTrack(identifier) {
        let response = await this.rest.get(`/loadtracks?identifier=${identifier}`);
        return response.data;
    }
}

module.exports = Node;
