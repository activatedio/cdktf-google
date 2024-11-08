import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';

interface ITailscaleProps {
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
echo "Starting Tailscale install"
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up --auth-key=${props.authToken} --advertise-exit-node
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
            image: 'ubuntu-2204-jammy-v20231213a',
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
