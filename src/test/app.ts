import pino from 'pino';

const logger = pino({ level: 'info', transport: { targets: [{ target: 'pino/file' }, { target: 'pino-pretty' }] } });

logger.info('yes hello');

export default logger;
