#!/usr/bin/env python3
"""MP-SPDZ external client for the demo.

Connects to the N compute parties, secret-shares the private input values to
them (no single party sees any cleartext), runs the computation, and prints the
revealed result(s) as JSON. Uses MP-SPDZ's ExternalIO/client.py.

argv: <host1,host2,...> <port_base> <client_id> <v1,v2,...> [<w1,w2,...>] [n_out]
  - the second vector (w) is appended to the inputs (used by dot-product);
  - n_out is the number of revealed outputs to read back (default 1).
"""
import sys, os, json
sys.path.insert(0, os.environ.get('MPSPDZ_HOME', '/opt/MP-SPDZ') + '/ExternalIO')
from client import Client  # noqa: E402


def parse_vec(s):
    return [int(round(float(x))) for x in s.split(',') if x != ''] if s else []


def main():
    hosts = sys.argv[1].split(',')
    port_base = int(sys.argv[2])
    client_id = int(sys.argv[3])
    values = parse_vec(sys.argv[4])
    second = parse_vec(sys.argv[5]) if len(sys.argv) > 5 else []
    n_out = int(sys.argv[6]) if len(sys.argv) > 6 else 1

    client = Client(hosts, port_base, client_id)
    client.send_private_inputs(values + second)
    out = client.receive_outputs(n_out)
    print(json.dumps({"results": [int(x) for x in out]}))


if __name__ == '__main__':
    main()
