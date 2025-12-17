const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Robô oficial de envio
 * Toda a lógica está em owlrunner.js
 */
const { owlrunner } = require('./owlrunner');

exports.owlrunner = owlrunner;
