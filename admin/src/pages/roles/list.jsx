import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table } from "antd";

export const RoleList = () => {
  const { tableProps } = useTable();

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="key" title="Key" />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record) => (
            <>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </> 
          )}
        />
      </Table>
    </List>
  );
};
