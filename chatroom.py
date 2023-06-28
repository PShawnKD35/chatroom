import asyncio
import websockets
import pathlib
import ssl
from datetime import datetime
import json
from collections import deque
import os
import hashlib
import magic

resFolder = "objs"
restoreHistoryLines = 50
historyCache = deque(maxlen=restoreHistoryLines)
users = set()
# Configure SSL connection
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('/home/shawn/certificates/pshawn.home.kg/full_chain.pem', '/home/shawn/certificates/pshawn.home.kg/private.key')
# Load user credentials
with open('./secrets.json', 'r') as secrets:
    secretDict = json.loads(secrets.read())
# Read last session chat history
recentHistoryLines = os.popen(f'tail -n {restoreHistoryLines} history.txt').read().split('\n')
if recentHistoryLines[-1] == '':
    del recentHistoryLines[-1]
for line in recentHistoryLines:
    historyCache.append(line)
recentHistoryLines = None
# Prepare for writing chat history
chatHistory = open('./history.txt', 'a')

def timestampHead():
    return f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | "

def logMessage(message):
    historyCache.append(message)
    chatHistory.write(message + '\n')

async def handler(websocket, path):
    userIp = websocket.remote_address[0]
    # auth
    #print(f"{userIp} trying to connect...")
    try:
        secret = await websocket.recv()
    except BaseException as e:
        print(f"{userIp} failed to connect: {type(e)=}")
        return
    if secret not in secretDict:
        print(f"{userIp} auth failed: {secret}")
        return
    name = secretDict[secret]
    # Register
    users.add(websocket)
    if len(historyCache) > 0:
        for line in historyCache:
        #await websocket.send('<br/>'.join(historyCache))
            await websocket.send(line)
    try:
        connectMessage = f"{timestampHead()}{name}({userIp}) connected."
        print(connectMessage)
        connectMessage = f"{timestampHead()}{name} connected."
        websockets.broadcast(users, connectMessage)
        logMessage(connectMessage)

        ## greeting
        # name = await websocket.recv()
        # print(f"<<< {name}")
        # greeting = f"Hello {name}!"
        # await websocket.send(greeting)
        # print(f">>> {greeting}")

        # messaging
        async for message in websocket:
            if message == '':
                await websocket.ping()
            else:
                if type(message) == bytes:
                    objectName = hashlib.md5(message).hexdigest()
                    objectType = magic.from_buffer(message, mime=True)
                    objectTypeSplit = objectType.split('/')
                    objectExtension = ''
                    if objectTypeSplit[1]:
                        objectExtension = objectTypeSplit[1]
                        objectName = f"{objectName}.{objectExtension}"
                    objectPath = f"site/{resFolder}/{objectName}"
                    if not os.path.exists(objectPath):
                        with open(objectPath, 'wb') as imgFile:
                            imgFile.write(message)
                    if 'image' in objectType:
                        message = f"<img src=\"{resFolder}/{objectName}\">"
                    elif 'video' in objectType:
                        message = f"<video src=\"{resFolder}/{objectName}\" type=\"{objectType}\" controls>"
                    elif 'audio' in objectType:
                        message = f"<audio src=\"{resFolder}/{objectName}\" type=\"{objectType}\" controls>"
                    else:
                        message = f"<object data=\"{resFolder}/{objectName}\" type=\"{objectType}\">"
                broadcastMessage = f"{timestampHead()}{name}: {message}"
                websockets.broadcast(users, broadcastMessage)
                logMessage(broadcastMessage)
    finally:
        # Unregister
        users.remove(websocket)
        disconnectMessage = f"{timestampHead()}{name}({userIp}) disconnected."
        print(disconnectMessage)
        disconnectMessage = f"{timestampHead()}{name} disconnected."
        websockets.broadcast(users, disconnectMessage)
        logMessage(disconnectMessage)

async def checkAlive():
    count = 0
    while True:
        await asyncio.sleep(10)
        count += 1
        websockets.broadcast(users, '')
        if count >= 6 and chatHistory:
            chatHistory.flush()
            count = 0

async def main():
    async with websockets.serve(handler, "0.0.0.0", 12345, ssl=ssl_context, max_size=100*1024*1024):
        await checkAlive()
        # await asyncio.Future()  # run forever

asyncio.run(main())
