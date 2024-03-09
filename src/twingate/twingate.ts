import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';

interface ITwingateProps {
  name: string;
  domain: string;
  instances: ITwingateInstanceProps[];
  networkHostProject: string;
  subnetwork: string;
}

interface ITwingateInstanceProps {
  name: string;
  zone: string;
  accessToken: string;
  refreshToken: string;
}

class Twingate extends Construct {
  constructor(scope: Construct, id: string, props: ITwingateProps) {
    super(scope, id);

    const serviceAccount = new google.serviceAccount.ServiceAccount(
      this,
      'serviceAccount',
      {
        accountId: `twingate-${props.name}`,
        displayName: `Twingate ${props.name}`,
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
echo "Starting Twingate install"
curl "https://binaries.twingate.com/connector/setup.sh" | TWINGATE_ACCESS_TOKEN="${iProps.accessToken}" TWINGATE_REFRESH_TOKEN="${iProps.refreshToken}" TWINGATE_NETWORK="${props.domain}" bash
echo "Finished Twingate install"
`;

      const name = `twingate-${props.name}-${iProps.name}`;

      new google.computeInstance.ComputeInstance(this, `instance-${i}`, {
        name: name,
        machineType: 'e2-small',
        zone: iProps.zone,
        tags: [`twingate-${props.name}`],
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

export {Twingate, ITwingateProps, ITwingateInstanceProps};
