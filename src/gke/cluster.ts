import {Construct} from 'constructs';

import * as google from '@cdktf/provider-google';

interface INodePoolProps {
  name: string;
  minTotalCount: number;
  maxTotalCount: number;
  machineType: string;
  nodeLocations?: string[];
}

interface IClusterProps {
  project: string;
  masterCidr: string;
  servicesSecondarySubnetName: string;
  clusterSecondarySubnetName: string;
  name: string;
  networkHostProject: string;
  subnetwork: string;
  allowedAccessCidrs: string[];
  nodePools: INodePoolProps[];
}

class Cluster extends Construct {
  public readonly serviceAccount: google.serviceAccount.ServiceAccount;

  public readonly cluster: google.containerCluster.ContainerCluster;

  constructor(scope: Construct, id: string, props: IClusterProps) {
    super(scope, id);

    const subnetwork =
      new google.dataGoogleComputeSubnetwork.DataGoogleComputeSubnetwork(
        this,
        'subnetwork',
        {
          project: props.networkHostProject,
          name: props.subnetwork,
        }
      );

    this.serviceAccount = new google.serviceAccount.ServiceAccount(
      this,
      'serviceAccount',
      {
        accountId: `cluster-${props.name}`,
        displayName: `Cluster ${props.name}`,
      }
    );

    this.cluster = new google.containerCluster.ContainerCluster(
      this,
      'cluster',
      {
        name: props.name,
        removeDefaultNodePool: true,
        initialNodeCount: 1,
        enableL4IlbSubsetting: true,
        workloadIdentityConfig: {
          workloadPool: `${props.project}.svc.id.goog`,
        },
        gatewayApiConfig: {
          channel: 'CHANNEL_STANDARD',
        },
        privateClusterConfig: {
          enablePrivateEndpoint: true,
          enablePrivateNodes: true,
          masterIpv4CidrBlock: props.masterCidr,
        },
        ipAllocationPolicy: {
          clusterSecondaryRangeName: props.clusterSecondarySubnetName,
          servicesSecondaryRangeName: props.servicesSecondarySubnetName,
        },
        masterAuthorizedNetworksConfig: {
          gcpPublicCidrsAccessEnabled: false,
          cidrBlocks: props.allowedAccessCidrs.map((c, i) => {
            return {
              cidrBlock: c,
              displayName: `net=${i}`,
            };
          }),
        },
        network: subnetwork.network,
        subnetwork: subnetwork.selfLink,
      }
    );

    props.nodePools.forEach(np => {
      new google.containerNodePool.ContainerNodePool(
        this,
        `nodePool_${np.name}`,
        {
          name: np.name,
          cluster: this.cluster.name,
          nodeLocations: np.nodeLocations,
          autoscaling: {
            totalMaxNodeCount: np.maxTotalCount,
            totalMinNodeCount: np.minTotalCount,
          },
          nodeConfig: {
            workloadMetadataConfig: {
              mode: 'GKE_METADATA',
            },
            preemptible: true,
            machineType: np.machineType,
            serviceAccount: this.serviceAccount.email,
            oauthScopes: ['https://www.googleapis.com/auth/cloud-platform'],
            tags: [`gke-${props.name}-${np.name}`],
          },
        }
      );
    });
  }
}

export {Cluster, IClusterProps};
