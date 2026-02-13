/**
 * Installer Profile Tab (Presenter)
 *
 * Displays installer profile details:
 * - Contact information
 * - Vehicle & equipment
 * - Certifications with verification status
 * - Skills with proficiency bars
 * - Service area territories
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/shared';
import { User, Mail, Phone, Car, Award, Star, MapPin } from 'lucide-react';
import type { InstallerDetail } from '@/lib/schemas/jobs/installers';

export function ProfileTab({ installer }: { installer: InstallerDetail }) {
  return (
    <div className="space-y-6">
      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {installer.user?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{installer.user.email}</span>
            </div>
          )}
          {installer.user?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{installer.user.phone}</span>
            </div>
          )}
          {installer.emergencyContactName && (
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-1">Emergency Contact</p>
              <p className="text-sm text-muted-foreground">
                {installer.emergencyContactName}
                {installer.emergencyContactRelationship &&
                  ` (${installer.emergencyContactRelationship})`}
              </p>
              {installer.emergencyContactPhone && (
                <p className="text-sm text-muted-foreground">
                  {installer.emergencyContactPhone}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle & Equipment */}
      {(installer.vehicleType !== 'none' || (installer.equipment && installer.equipment.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {installer.vehicleType !== 'none' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="capitalize font-medium">{installer.vehicleType}</span>
                {installer.vehicleReg && (
                  <Badge variant="outline">{installer.vehicleReg}</Badge>
                )}
              </div>
            )}
            {installer.equipment && installer.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {installer.equipment.map((item, i) => (
                  <Badge key={i} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certifications
            <Badge variant="secondary" className="ml-auto">
              {installer.certifications?.length || 0}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.certifications || installer.certifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certifications recorded</p>
          ) : (
            <div className="space-y-3">
              {installer.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{cert.certificationType.replace('_', ' ')}</p>
                    {cert.licenseNumber && (
                      <p className="text-xs text-muted-foreground">
                        License: {cert.licenseNumber}
                      </p>
                    )}
                    {cert.expiryDate && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {cert.isVerified ? (
                    <StatusBadge status="verified" variant="success" />
                  ) : (
                    <StatusBadge status="pending" variant="warning" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.skills || installer.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills recorded</p>
          ) : (
            <div className="space-y-3">
              {installer.skills.map((skill) => (
                <div key={skill.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{skill.skill.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">
                      {skill.yearsExperience} years
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={skill.proficiencyLevel * 20} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-8">
                      {skill.proficiencyLevel}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Territories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Service Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!installer.territories || installer.territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No territories assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {installer.territories.map((territory) => (
                <Badge key={territory.id} variant="outline">
                  {territory.postcode}
                  {territory.suburb && ` - ${territory.suburb}`}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
