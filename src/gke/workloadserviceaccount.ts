import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';
import * as cdktf from 'cdktf';

interface IWorkloadServiceAccountK8sSA {
  namespace: string;
  name: string;
}
interface IWorkloadServiceAccountProps extends cdktf.TerraformMetaArguments {
  name: string;
  project: string;
  k8sSAs: IWorkloadServiceAccountK8sSA[];
}

class WorkloadServiceAccount extends Construct {
  public readonly serviceAccount: google.serviceAccount.ServiceAccount;
  constructor(
    scope: Construct,
    id: string,
    props: IWorkloadServiceAccountProps
  ) {
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

export {WorkloadServiceAccount, IWorkloadServiceAccountProps};
