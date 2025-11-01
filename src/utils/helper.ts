import { getPreferenceValues } from "@raycast/api";

export type Entry = {
  id?: string;
  amount: number;
  currency: {
    code: string;
  };
  date: string;
  desc: string;
  account?: string;
  category: string;
  tags: string[];
  created?: string;
  modified?: string;
  completed?: boolean;
  deleted?: boolean;
};

export type Category = {
  id: string;
  name: string;
  modified: Date;
  type: string;
  deleted: boolean;
  counts: {
    entries: number;
    tags: number;
  };
};

export type Tag = {
  id: string;
  name: string;
  modified: string;
  type: string;
  category: string;
  count: number;
  deleted: number;
};

export async function getCategories(): Promise<Category[]> {
  const { token } = getPreferenceValues();
  const response = await fetch("https://api.toshl.com/categories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data as Category[];
}

export async function getTags(): Promise<Tag[]> {
  const { token } = getPreferenceValues();
  const response = await fetch("https://api.toshl.com/tags", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  return data as Tag[];
}

export function getDateRange() {
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);
  return [lastWeek.toLocaleDateString("en-CA"), today.toLocaleDateString("en-CA")];
}
