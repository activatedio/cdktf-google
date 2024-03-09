import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';
import * as random from '@cdktf/provider-random';

interface IPrivateBucketProps {
  prefix: string;
  location: string;
  policy: string;
}

class PrivateBucket extends Construct {
  public readonly bucket: google.storageBucket.StorageBucket;
  constructor(scope: Construct, id: string, props: IPrivateBucketProps) {
    super(scope, id);

    const suffix = new random.stringResource.StringResource(this, 'random', {
      length: 16,
      special: false,
      upper: false,
    });

    this.bucket = new google.storageBucket.StorageBucket(this, 'bucket', {
      name: `${props.prefix}-${suffix.result}`,
      publicAccessPrevention: 'enforced',
      location: props.location,
    });

    new google.storageBucketIamPolicy.StorageBucketIamPolicy(this, 'policy', {
      bucket: this.bucket.name,
      policyData: props.policy,
    });
  }
}

export {PrivateBucket, IPrivateBucketProps};
