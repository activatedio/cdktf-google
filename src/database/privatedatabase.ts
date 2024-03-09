// Database

import * as google from '@cdktf/provider-google';
import {Construct} from 'constructs';

interface IPrivateDatabaseProps {
  zoneProject: string;
  zoneName: string;
  name: string;
  networkHostProject: string;
  network: string;
  ipAddress: string;
}

class PrivateDatabase extends Construct {
  constructor(scope: Construct, id: string, props: IPrivateDatabaseProps) {
    super(scope, id);

    const network =
      new google.dataGoogleComputeNetwork.DataGoogleComputeNetwork(
        this,
        'network',
        {
          project: props.networkHostProject,
          name: props.network,
        }
      );

    const address = new google.computeGlobalAddress.ComputeGlobalAddress(
      this,
      'address',
      {
        network: network.id,
        project: props.networkHostProject,
        name: `database-${props.name}`,
        addressType: 'INTERNAL',
        purpose: 'VPC_PEERING',
        address: props.ipAddress,
        prefixLength: 24,
      }
    );

    const connection =
      new google.serviceNetworkingConnection.ServiceNetworkingConnection(
        this,
        'connection',
        {
          network: network.id,
          service: 'servicenetworking.googleapis.com',
          reservedPeeringRanges: [address.name],
        }
      );

    const database = new google.sqlDatabaseInstance.SqlDatabaseInstance(
      this,
      'instance',
      {
        name: `${props.name}`,
        databaseVersion: 'POSTGRES_15',
        settings: {
          tier: 'db-custom-2-3840',
          ipConfiguration: {
            ipv4Enabled: false,
            privateNetwork: network.id,
            enablePrivatePathForGoogleCloudServices: true,
          },
          backupConfiguration: {
            enabled: true,
            backupRetentionSettings: {
              retainedBackups: 21,
            },
          },
        },
        dependsOn: [connection],
      }
    );

    const zone = new google.dataGoogleDnsManagedZone.DataGoogleDnsManagedZone(
      this,
      'zone',
      {
        name: props.zoneName,
        project: props.zoneProject,
      }
    );

    new google.dnsRecordSet.DnsRecordSet(this, 'recordSet', {
      project: props.zoneProject,
      type: 'A',
      managedZone: zone.name,
      ttl: 300,
      name: `db-${props.name}.${zone.dnsName}`,
      rrdatas: [database.privateIpAddress],
    });
  }
}

export {PrivateDatabase, IPrivateDatabaseProps};
