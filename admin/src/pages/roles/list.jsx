import React from "react";
import { List, useTable, EditButton, DeleteButton, ShowButton } from "@refinedev/antd";
import { Table, Space } from "antd";

export const RoleList = () => {
    const { tableProps } = useTable({
        syncWithLocation: true,
    });

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="id" 
                    title="ID" 
                    render={(value) => <span>{value?.toString()}</span>}
                />
                <Table.Column dataIndex="name" title="名称" />
                <Table.Column dataIndex="key" title="标识符" />
                <Table.Column 
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                            <ShowButton hideText size="small" recordItemId={record.id} />
                            <DeleteButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
