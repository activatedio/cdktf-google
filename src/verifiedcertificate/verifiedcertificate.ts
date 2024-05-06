import {Construct} from 'constructs';
import * as google from '@cdktf/provider-google';
import {Fn} from 'cdktf';

interface IVerifiedCertificateProps {
  zoneProject?: string;
  zoneName: string;
  name: string;
}

class VerifiedCertificate extends Construct {
  public readonly certificate: google.certificateManagerCertificate.CertificateManagerCertificate;
  public readonly domains: string[];
  constructor(scope: Construct, id: string, props: IVerifiedCertificateProps) {
    super(scope, id);

    const zone = new google.dataGoogleDnsManagedZone.DataGoogleDnsManagedZone(
      this,
      'zone',
      {
        name: props.zoneName,
        project: props.zoneProject,
      }
    );

    const dnsName = Fn.trimsuffix(zone.dnsName, '.');

    const fullName = props.name ? `${props.name}.${dnsName}` : dnsName;
    const fullNameSafe = Fn.replace(fullName.replace('*', 'star'), '.', '-');

    const auth =
      new google.certificateManagerDnsAuthorization.CertificateManagerDnsAuthorization(
        this,
        'authorization',
        {
          domain: props.name === '*' ? dnsName : fullName,
          name: fullNameSafe,
        }
      );

    this.domains = props.name === '*' ? [fullName, dnsName] : [fullName];

    this.certificate =
      new google.certificateManagerCertificate.CertificateManagerCertificate(
        this,
        'cert',
        {
          name: fullNameSafe,
          managed: {
            // We include the apex along with any wildcard
            domains: this.domains,
            dnsAuthorizations: [auth.id],
          },
        }
      );

    new google.dnsRecordSet.DnsRecordSet(this, 'recordSet', {
      project: props.zoneProject,
      type: auth.dnsResourceRecord.get(0).type,
      managedZone: zone.name,
      ttl: 300,
      name: auth.dnsResourceRecord.get(0).name,
      rrdatas: [auth.dnsResourceRecord.get(0).data],
    });
  }
}

export {VerifiedCertificate, IVerifiedCertificateProps};
