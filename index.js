const V1 = require('./src/versions/v1/SandySounds');
const V2 = require('./src/versions/v2/SandySounds');
const DefaultClient = require('./src/clients/Default');
const ErisClient = require('./src/clients/Eris');
const DJSClient = require('./src/clients/DJS');

function SandySounds(...args) {
    return new V1(...args);
}

SandySounds.Clients = {
    Default: DefaultClient,
    Eris: ErisClient,
    DJS: DJSClient
};

SandySounds.Versions = {
    V1: V1,
    V2: V2
};

module.exports = SandySounds;