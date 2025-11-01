import { getPreferenceValues, List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { Entry, Category, Tag, getCategories, getDateRange, getTags } from "./utils/helper";
import { useEffect, useState } from "react";
import AddExpense from "./addExpense";

export default function Command() {
  const { token } = getPreferenceValues();
  const [startDate, endDate] = getDateRange();
  const [data, setData] = useState<{ date: string; entries: Entry[] }[] | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const fetchData = async () => {
    const [categories, tags, response] = await Promise.all([
      getCategories(),
      getTags(),
      fetch(`https://api.toshl.com/entries?from=${startDate}&to=${endDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);
    setCategories(categories);
    setTags(tags);
    const data = (await response.json()) as Entry[];
    const dates = Array.from(new Set(data.map((entry) => entry.date)));

    setData(
      dates.map((d: string) => ({
        date: d,
        entries: data.filter((entry) => entry.date === d),
      })),
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (item: Entry) => {
    await fetch(`https://api.toshl.com/entries/${item.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fetchData();
  };

  return (
    <>
      <List isLoading={data === undefined} isShowingDetail={data && data.length > 0}>
        {data?.length === 0 ? (
          <List.EmptyView title="No expenses found" />
        ) : (
          <>
            {data?.map((item) => (
              <List.Section
                key={item.date}
                title={
                  item.date === new Date().toLocaleDateString("en-CA")
                    ? "Today"
                    : new Date(item.date).toLocaleDateString("en-CA", {
                        weekday: "short",
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                      })
                }
                subtitle={`RM ${item.entries.reduce((acc, cur) => acc + Math.abs(cur.amount), 0).toFixed(2)}`}
              >
                {item.entries.map((item) => (
                  <List.Item
                    key={item.id}
                    icon={Icon.Receipt}
                    title={item.desc}
                    accessories={[
                      {
                        text: `RM ${Math.abs(item.amount).toFixed(2)}`,
                      },
                    ]}
                    detail={
                      <List.Item.Detail
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Date" text={item.date} />
                            <List.Item.Detail.Metadata.Label
                              title="Amount"
                              text={`RM ${Math.abs(item.amount).toFixed(2)}`}
                            />
                            <List.Item.Detail.Metadata.TagList title="Category">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={categories.find((c) => c.id === item.category)?.name || item.category}
                                color={Color.Green}
                              />
                            </List.Item.Detail.Metadata.TagList>
                            <List.Item.Detail.Metadata.TagList title="Tags">
                              {item.tags.map((tag) => (
                                <List.Item.Detail.Metadata.TagList.Item
                                  key={tag}
                                  text={tags.find((t) => t.id === tag)?.name || tag}
                                  color={Color.Red}
                                  icon={Icon.Tag}
                                />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="Description" text={item.desc} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel title="Add New Expense">
                        <Action.Push
                          title="Edit Expense"
                          target={<AddExpense data={item} />}
                          icon={Icon.Pencil}
                          onPop={fetchData}
                        />
                        <Action
                          title="Delete"
                          onAction={() => handleDelete(item)}
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            ))}
          </>
        )}
      </List>
    </>
  );
}
