#!/usr/bin/env node

import { parse } from 'cli'

const options = parse({
  config: [ 'c', 'Path for the server side config file to load at startup', 'file'],
  port: [ 'p', 'Port to listen to', 'int'],
  debug: [false, 'Debug mode, with live reload, source maps etc.', 'boolean'],
  'ssl-port': [ false, 'Port to listen to for SSL/HTTPS', 'int'],
  'force-https': [ false, 'Force HTTPS', 'boolean'],
  'ssl-private-key': [ false, 'Path to private key for SSL', 'file'],
  'ssl-certificate': [ false, 'Path to SSL certificate', 'file'],
  'force-https-trust-xfp-header': [ false, 'Sets the trustXFPHeader param of the express module "cookie-session". Use only with --force-https', 'boolean'],
  'session-secret': ['s', 'Session secret', 'string'],
  'cors-url': ['', 'Enable CORS for URL (can be "*")', 'string'],
  'client-config': ['', 'Path to client config file to be served on .silex-client.js', 'string'],
  'fs-root': ['', 'Path to the root folder where to store websites. Used by the default backend (fs).', 'string'],
}, {})

if(options.config) process.env.CONFIG = options.config
if(options.port) process.env.PORT = options.port
if(options.debug) process.env.SILEX_DEBUG = options.debug
if(options['ssl-port']) process.env.SSL_PORT = options['ssl-port']
if(options['force-https']) process.env.SILEX_FORCE_HTTPS = options['force-https']
if(options['ssl-private-key']) process.env.SILEX_SSL_PRIVATE_KEY = options['ssl-private-key']
if(options['ssl-certificate']) process.env.SILEX_SSL_CERTIFICATE = options['ssl-certificate']
if(options['force-https-trust-xfp-header']) process.env.SILEX_FORCE_HTTPS_TRUST_XFP_HEADER = options['force-https-trust-xfp-header']
if(options['session-secret']) process.env.SILEX_SESSION_SECRET = options['session-secret']
if(options['cors-url']) process.env.SILEX_CORS_URL = options['cors-url']
if(options['client-config']) process.env.SILEX_CLIENT_CONFIG = options['client-config']
if(options['fs-root']) process.env.FS_ROOT = options['fs-root']

import './index'