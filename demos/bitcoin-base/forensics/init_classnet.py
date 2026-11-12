"""Initialize a small shared classroom network without assessment evidence."""
from pathlib import Path
import json, time, hashlib, struct
from seeder import RpcClient

ROOT=Path(__file__).parent
SHARE=Path('/home/user/share');SHARE.mkdir(exist_ok=True)
class ClassroomRpc(RpcClient):
    def call(self, method, params=None, wallet=None):
        if method=='generatetoaddress':
            n, address, *tries=params
            hashes=[]
            for _ in range(n):
                tip=super().call('getbestblockhash')
                header=super().call('getblockheader',[tip])
                # Generate a valid template, then space the synthetic evidence
                # blocks in two-block windows (21 seconds, then one second)
                # to keep the classroom retarget inexpensive and the tip in the past. This never changes the host or node clock.
                timestamp=max(int(time.time())-5400,header['time']+(21 if (header['height']+1)%2 else 1))
                pool=super().call('getrawmempool',[True])
                txs=sorted(pool,key=lambda tx:pool[tx]['ancestorcount'])
                candidate=super().call('generateblock',[address,txs,False])
                block=bytearray.fromhex(candidate['hex'])
                block[68:72]=struct.pack('<I',timestamp)
                # The fork permits minimum difficulty after two target spacings.
                bits=struct.unpack('<I',block[72:76])[0] if (header['height']+1)%2==0 else 0x207fffff
                block[72:76]=struct.pack('<I',bits)
                target=(bits & 0x7fffff) << (8*((bits>>24)-3))
                for nonce in range(2**32):
                    block[76:80]=struct.pack('<I',nonce)
                    if int.from_bytes(hashlib.sha256(hashlib.sha256(block[:80]).digest()).digest(),'little')<=target:break
                rejected=super().call('submitblock',[block.hex()])
                if rejected:raise RuntimeError(f'Synthetic block at {header["height"]+1} rejected: {rejected}; bits={bits:#x}')
                hashes.append(super().call('getbestblockhash'))
            return hashes
        return super().call(method,params,wallet)

rpc=ClassroomRpc.from_cookie('/home/user/.bitcoin',chain='main')
marker=Path('/home/user/.bitcoin/public-classnet.marker')
if not marker.exists() and rpc.call('getblockcount') != 0:
    raise SystemExit('Use a fresh data directory for the public ClassNet; assessment evidence is not served.')
if not marker.exists():
    rpc.call('createwallet',['treasury'])
    address=rpc.call('getnewaddress',wallet='treasury')
    rpc.call('generatetoaddress',[21,address])
    (SHARE/'address.txt').write_text(address+'\n')
    rpc.call('unloadwallet',['treasury'])
    marker.write_text('public-classnet-no-assessment-chain\n')
(SHARE/'catalog.json').write_text((ROOT/'catalog.json').read_text())
print('ClassNet ready: Regtest/ClassNet exercises; no forensics dataset',flush=True)
