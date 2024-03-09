import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';

interface IWorkloadServiceAccountK8sSA {
  namespace: string;
  name: string;
}
interface IWorkloadServiceAccount {
  name: string;
  project: string;
  k8sSAs: IWorkloadServiceAccountK8sSA[];
}

class WorkloadServiceAccont extends Construct {
  public readonly serviceAccount: google.serviceAccount.ServiceAccount;
  constructor(scope: Construct, id: string, props: IWorkloadServiceAccount) {
    super(scope, id);

    this.serviceAccount = new google.serviceAccount.ServiceAccount(this, 'sa', {
      accountId: props.name,
    });

    new google.serviceAccountIamBinding.ServiceAccountIamBinding(
      this,
      'saBindings',
      {
        serviceAccountId: `projects/${props.project}/serviceAccounts/${this.serviceAccount.email}`,
        members: props.k8sSAs.map(
          ksa =>
            `serviceAccount:${props.project}.svc.id.goog[${ksa.namespace}/${ksa.name}]`
        ),
        role: 'roles/iam.serviceAccountTokenCreator',
      }
    );
  }
}

export {WorkloadServiceAccont, IWorkloadServiceAccount};
