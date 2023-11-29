const questionaryLogs = (log, socketId, phoneNumber, ip, data) => {
    console.log('\x1b[36m%s\x1b[0m', `[QUESTIONARY]${socketId?.length ? `[SOCKET_ID: ${socketId}]` : ''}${phoneNumber?.length ? `[PHONE: ${phoneNumber}]` : ''}${ip?.length ? `[IP: ${ip}]` : ''} ${log}`, data || '');
}

const clinicsLogs = (log, socketId, phoneNumber, ip) => {
    console.log('\x1b[33m%s\x1b[0m', `[CLINICS]${socketId?.length ? `[SOCKET_ID: ${socketId}]` : ''}${phoneNumber?.length ? `[PHONE: ${phoneNumber}]` : ''}${ip?.length ? `[IP: ${ip}]` : ''} ${log}`);
}

const generalLogs = (log, socketId, phoneNumber, ip) => {
    console.log('\x1b[32m%s\x1b[0m', `[GENERAL]${socketId?.length ? `[SOCKET_ID: ${socketId}]` : ''}${phoneNumber?.length ? `[PHONE: ${phoneNumber}]` : ''}${ip?.length ? `[IP: ${ip}]` : ''} ${log}`);
}

module.exports = { questionaryLogs, clinicsLogs, generalLogs };