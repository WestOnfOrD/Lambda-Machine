import sys
import socket
import ipaddress
import threading, subprocess
import queue
import time
import inspect
import re

ports = {}
ports["alpha"]             = 26000 # HTTP
ports["omega"]             = 26001 # HTTP
ports["delta"]             = 26002 #
# ports["lambda-M"]          = 26003 #
ports["lambda-m"]          = 26004 #

# used for host discovery
ports["BroadcastListenerAddr"]    = 26101 # UDP
ports["Broadcast"]                = 26102 # UDP

## START subproc
class subProc():
  errQueue=queue.Queue()
  outQueue=queue.Queue()
  subProc=None
  stdout=None
  def getOutput(self):
    time.sleep(.1)
    out=None
    err=None
    if(not self.queuesEmpty()):
      try:    out=self.outQueue.get(False).strip()
      except: out=None
      try:    err=self.errQueue.get(False).strip()
      except: err=None
    return (out, err)
  def queuesEmpty(self):
    if(self.errQueue.empty() and self.outQueue.empty()):
      return True
    else:
      return False
  def isAlive(self):
    if (self.subProc):
      if (self.subProc.poll() == None):
        return 1 # alive and running
      else:
        return 0 # terminated
    else:
      return None # has not been born
  def waitForSubProc(self):
    while (self.isAlive() == None):
      time.sleep(.1)
  def __init__(self, command):
    threading.Thread(target=self._subProcess, args=(command,), daemon=True).start()
    self.waitForSubProc()
    threading.Thread(target=self._ioQueue, args=(self.subProc.stdout, self.outQueue), daemon=True).start()
    threading.Thread(target=self._ioQueue, args=(self.subProc.stderr, self.errQueue), daemon=True).start()
  def _ioQueue(self, pipe, queue):
    self.waitForSubProc()
    out=None
    while(1):
      for line in pipe:
        queue.put(str(line.decode("UTF-8")),block=True, timeout=None)
      if(self.isAlive() == 0):
        break
      time.sleep(.1)
  def _subProcess(self, command):
    self.subProc = subprocess.Popen(command.split(" "), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
## END subproc
def log(string):
    sys.stdout.write("<log> " + getCallerFile() + " : " + str(string).strip() + "\n")
    sys.stdout.flush()
def error(string, *e):
    sys.stderr.write("<ERROR> " + getCallerFile() + " : " + str(string) + "\n")
    if len(e) > 0:
      sys.stderr.write("============================\n")
      sys.stderr.write(str(e))
    sys.stderr.flush()
    sys.exit(1)
def getAddr():
    # returns LAN address
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  s.connect(("8.8.8.8", 80))
  return s.getsockname()[0]

class nodeDiscovery():
    # Interprocess communication
    # served over UDP
  broadcastAddr=ipaddress.ip_network('192.168.1.0/24')
  sleepTime=5
  alive=True
  queueSize=20
  def __init__(self,name):
    # initializes a multicast UDP socket and broadcasts the nodes ip address to the subnet.
    #   It also listens for incoming messages
    self.readBuffer=queue.Queue(maxsize=self.queueSize)
    self.name=name
    self.addr=getAddr()
    self.broadcastMsg=str(self.addr)+" "+str(self.name)
    broadcastThread = threading.Thread(target=self._broadcast, args = (self.broadcastMsg,ports["Broadcast"]))
    broadcastThread.start()

  def listen(self):
      # only one listener per computer. This will be used by the omega server to create a network table. UDP
      #      otherwise : " OSError: [Errno 98] Address already in use "
      listenThread = threading.Thread(target=self._listen, args = ())
      listenThread.start()

  def _broadcast(self, msg, port):
      # continually sends out ping messages with the clients ip addr and name. UDP
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    while self.alive:
        for addr in self.broadcastAddr:
            sock.sendto(msg.encode("UTF-8"), (str(addr), port))
    sleep(self.sleepTime)

  def _listen(self):
    # broadcast the omega server's address for Lambda Minions
    log("Broadcasting Omega Server's IP on port : " + str(ports["BroadcastListenerAddr"]))
    broadcastThread = threading.Thread(target=self._broadcast, args = (self.broadcastMsg,ports["BroadcastListenerAddr"]))
    broadcastThread.start()
    # listens to the broadcast messages and adds them to queue. UDP
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((self.addr, ports["Broadcast"])) # UDP
    while self.alive:
      data, addr = sock.recvfrom(1024)
      if not self.readBuffer.full():
        self.readBuffer.put(data.decode("UTF-8"))
      else:
        self.readBuffer.get()
        lu.log("Queue overflow. Dropping datagram.")
  def getMsg (self):
      # returns the most recent broadcast message in the queue
    if not self.readBuffer.empty():
      return self.readBuffer.get()
    else:
      return None
  def sendMsg(self):
      # temporary may not be implemented.
    if self.alive:
      for addr in self.broadcastAddr:
        self.sock.sendto(msg.encode("UTF-8"), (str(addr), self.broadcastPort))
      return 0
    return -1
  def kill(self):
      # destroys the nodeDiscovery threads
    self.alive=False
def getCallerFile():
  # uses stack tracing to return the file name of the calling process
  try:
    for i in inspect.stack():
      for j in i:
        if(type(j) == str):
          if re.match(".*.py$", j.strip()) and not re.match(".*lambdaUtils.py$", j.strip()) :
            j=re.sub(".*/", "", j)
            j=re.sub(".py", "", j)
            return j
  except:
    return "---"
if __name__ == '__main__':
    getCallerFile()
    
