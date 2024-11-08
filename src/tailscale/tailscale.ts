import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';

interface ITailscaleProps {
  routes: string[];
  name: string;
  authToken: string;
  instances: ITailscaleInstanceProps[];
  networkHostProject: string;
  subnetwork: string;
}

interface ITailscaleInstanceProps {
  name: string;
  zone: string;
}

class Tailscale extends Construct {
  constructor(scope: Construct, id: string, props: ITailscaleProps) {
    super(scope, id);

    const serviceAccount = new google.serviceAccount.ServiceAccount(
      this,
      'serviceAccount',
      {
        accountId: `tailscale-${props.name}`,
        displayName: `Tailscale ${props.name}`,
      }
    );

    const subnetwork =
      new google.dataGoogleComputeSubnetwork.DataGoogleComputeSubnetwork(
        this,
        'subnetwork',
        {
          project: props.networkHostProject,
          name: props.subnetwork,
        }
      );

    for (let i = 0; i < props.instances.length; i++) {
      const iProps = props.instances[i];

      const script = `#!/bin/bash
set +e
apt-get update
apt-get upgrade -y
echo "Starting Tailscale install"
echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' >> /etc/sysctl.d/99-tailscale.conf
sysctl -p /etc/sysctl.d/99-tailscale.conf
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up --auth-key=${props.authToken} --advertise-exit-node --advertise-routes=${props.routes.join(",")}
echo "Finished Tailscale install"
`;

      const name = `tailscale-${props.name}-${iProps.name}`;

      new google.computeInstance.ComputeInstance(this, `instance-${i}`, {
        name: name,
        machineType: 'e2-small',
        zone: iProps.zone,
        tags: [`tailscale-${props.name}`],
        allowStoppingForUpdate: true,
        bootDisk: {
          initializeParams: {
            image: 'ubuntu-minimal-2410-oracular-amd64-v20241021',
          },
        },
        networkInterface: [
          {
            network: subnetwork.network,
            subnetwork: subnetwork.selfLink,
          },
        ],
        metadata: {
          'serial-port-logging-enable': 'TRUE',
        },
        metadataStartupScript: script,
        serviceAccount: {
          email: serviceAccount.email,
          scopes: ['cloud-platform'],
        },
      });
    }
  }
}

export {Tailscale, ITailscaleProps, ITailscaleInstanceProps};
