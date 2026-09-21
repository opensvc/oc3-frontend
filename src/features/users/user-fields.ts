import type { components } from "@/lib/api/schema";
import type { DetailGroup } from "@/components/opensvc/DetailPanel";

type UserRow = components["schemas"]["UserRow"];

const text = (prop: keyof UserRow) => (row: UserRow) => {
  const value = row[prop];
  return value === undefined ? undefined : String(value);
};

const field = (prop: keyof UserRow) => ({ prop, format: text(prop) });

/** Collector booleans ("T" / "F"), as a switch and read-only. */
const flag = (prop: keyof UserRow) => ({ ...field(prop), input: "boolean" as const });

/**
 * Properties of a user, shared by the detail panel and the profile page, read-only.
 * `registration_id` and `reset_password_key` are not among them: the reset key is
 * enough to change a password, see notes.md.
 */
export const USER_GROUPS: DetailGroup<UserRow>[] = [
  {
    key: "identity",
    family: "team",
    fields: [
      field("email"),
      field("username"),
      field("first_name"),
      field("last_name"),
      field("phone_work"),
      field("im_type"),
      field("im_username"),
      field("id"),
    ],
  },
  {
    key: "notifications",
    family: "alert",
    fields: [
      flag("email_notifications"),
      field("email_log_level"),
      field("email_notifications_delay"),
      flag("im_notifications"),
      field("im_log_level"),
      field("im_notifications_delay"),
    ],
  },
  {
    key: "restrictions",
    family: "security",
    fields: [
      flag("lock_filter"),
      field("quota_app"),
      field("quota_org_group"),
      field("quota_docker_registries"),
    ],
  },
];

export const USER_PROPS_QUERY = USER_GROUPS.flatMap((group) =>
  group.fields.map((f) => f.prop),
).join(",");
