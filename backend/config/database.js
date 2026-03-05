const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

let db = null;

const initializeDB = async () => {
    db = await open({
        filename: path.join(__dirname, '../restaurant.db'),
        driver: sqlite3.Database
    });
    return db;
};

const getDB = () => db;

module.exports = { initializeDB, db: getDB };
