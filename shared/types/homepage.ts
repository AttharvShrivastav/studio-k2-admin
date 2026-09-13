import type {
  HomepageSpotlightConfig,
  HomepageSpotlightConfigDraft,
} from "../schemas/homepage.js";

export type HomepageAdminResponse = { spotlight: HomepageSpotlightConfigDraft };

export type PublicHomepageSpotlightSlot = HomepageSpotlightConfig["slots"][number] & {
  project: {
    id: string;
    title: string;
    slug: string;
  };
};

export type PublicHomepageResponse = {
  spotlight: {
    slots: [
      PublicHomepageSpotlightSlot,
      PublicHomepageSpotlightSlot,
      PublicHomepageSpotlightSlot,
      PublicHomepageSpotlightSlot,
    ];
  };
};
