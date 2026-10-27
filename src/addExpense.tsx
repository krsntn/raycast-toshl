import {
  getPreferenceValues,
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Entry, getCategories, getTags } from "./utils/helper";
import { useEffect, useRef, useState } from "react";

interface AddExpenseFormValues {
  amount: string;
  category: string;
  tags: string[];
  desc: string;
  date: string;
}

type Option = { id: string; name: string };

const toOptions = (items: Option[]) => items.map(({ id, name }) => ({ id, name }));
const toKey = (items: Option[]) => JSON.stringify([...items].sort((a, b) => a.id.localeCompare(b.id)));

export default function AddExpense({ data }: { data?: Entry | undefined }) {
  const { pop } = useNavigation();
  const [options, setOptions] = useState<{ categories: Option[]; tags: Option[] }>({ categories: [], tags: [] });

  const amountRef = useRef<Form.TextField>(null);
  const categoryRef = useRef<Form.Dropdown>(null);
  const tagsRef = useRef<Form.TagPicker>(null);
  const descRef = useRef<Form.TextArea>(null);

  useEffect(() => {
    const loadCachedData = async () => {
      const [cachedCategories, cachedTags] = await Promise.all([
        LocalStorage.getItem<string>("categories"),
        LocalStorage.getItem<string>("tags"),
      ]);

      const cached = {
        categories: toOptions(JSON.parse(cachedCategories ?? "[]")),
        tags: toOptions(JSON.parse(cachedTags ?? "[]")),
      };
      setOptions(cached);
      return cached;
    };

    const fetchData = async () => {
      const [categories, tags] = await Promise.all([getCategories(), getTags()]);
      return { categories: toOptions(categories), tags: toOptions(tags) };
    };

    const syncData = async () => {
      try {
        const [cached, fresh] = await Promise.all([loadCachedData(), fetchData()]);

        // Re-rendering while the user types drops keystrokes, so skip it when nothing changed.
        if (toKey(cached.categories) === toKey(fresh.categories) && toKey(cached.tags) === toKey(fresh.tags)) {
          return;
        }

        setOptions(fresh);
        await LocalStorage.setItem("categories", JSON.stringify(fresh.categories));
        await LocalStorage.setItem("tags", JSON.stringify(fresh.tags));
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch data. ${error}`,
        });
      }
    };

    syncData();
  }, []);

  const { handleSubmit } = useForm<AddExpenseFormValues>({
    async onSubmit(values) {
      const body: Entry = {
        amount: Number(values.amount) * -1,
        category: values.category,
        tags: values.tags,
        desc: values.desc,
        date: new Date(values.date).toLocaleDateString("en-CA"),
        currency: {
          code: "MYR",
        },
      };

      if (data) {
        body.id = data.id;
        body.modified = data.modified;
      }

      const response = await fetch(`https://api.toshl.com/entries/${data?.id ?? ""}`, {
        method: data ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${getPreferenceValues().token}`,
        },
        body: JSON.stringify(body),
      });

      if ([200, 201].includes(response.status)) {
        showToast({
          style: Toast.Style.Success,
          title: data ? "Expense updated" : "Expense added",
        });

        if (data) {
          pop();
        } else {
          amountRef.current?.reset();
          categoryRef.current?.reset();
          tagsRef.current?.reset();
          descRef.current?.reset();
          amountRef.current?.focus();
        }
      }
    },
    validation: {
      amount: FormValidation.Required,
      category: FormValidation.Required,
      tags: FormValidation.Required,
      desc: FormValidation.Required,
      date: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={options.categories.length === 0 || options.tags.length === 0}
    >
      {options.categories.length > 0 && options.tags.length > 0 ? (
        <>
          <Form.TextField
            id="amount"
            title="Amount"
            placeholder="Enter amount"
            defaultValue={data ? Math.abs(data.amount).toString() : ""}
            ref={amountRef}
          />
          <Form.Dropdown
            id="category"
            title="Category"
            defaultValue={data?.category || options.categories.find((c) => c.name.startsWith("Food"))?.id}
            ref={categoryRef}
          >
            {options.categories.map((category) => (
              <Form.Dropdown.Item key={category.id} value={category.id} title={category.name} />
            ))}
          </Form.Dropdown>
          <Form.TagPicker
            id="tags"
            title="Tags"
            defaultValue={data?.tags || options.tags.filter((tag) => tag.name === "Dating").map((tag) => tag.id)}
            ref={tagsRef}
          >
            {options.tags.map((tag) => (
              <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
            ))}
          </Form.TagPicker>
          <Form.TextArea
            id="desc"
            title="Description"
            placeholder="Enter description"
            defaultValue={data?.desc}
            ref={descRef}
          />
          <Form.DatePicker
            id="date"
            title="Date"
            defaultValue={data ? new Date(data.date) : new Date()}
            type={Form.DatePicker.Type.Date}
          />
        </>
      ) : null}
    </Form>
  );
}
