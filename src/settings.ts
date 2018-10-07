/**
 * Timestamp of the poll's closing time. Once past this date, the results from
 * the 2018 election will be fetched. Before this date, the results of the
 * previous general election will be shown instead.
 */
export const POLL_CLOSE_TIME = Date.parse('2018-10-01T20:00:00.000-04:00');

/**
 * Total number of seats.
 */
export const TOTAL_NB_SEATS = 125;

/**
 * Refresh interval for the data.
 */
export const REFRESH_INTERVAL = 5 * 1000;
