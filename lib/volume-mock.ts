export type Partition = {
  id: string;
  label: string;
  type: string;
  fileSystem: string;
  sizeBytes: number;
  partitionType: string;
};

export type PhysicalDisk = {
  id: string;
  label: string;
  kind: 'HDD' | 'SSD' | 'optical';
  partitions: Partition[];
};

export type LogicalVolume = {
  id: string;
  letter: string;
  volumeType: string;
  fileSystem: string;
  totalBytes: number;
  usedBytes: number;
  codepage: string;
  physicalObject: string;
};

export const MOCK_LOGICAL_VOLUMES: LogicalVolume[] = [
  {
    id: 'lv-c',
    letter: 'C:',
    volumeType: 'Basic',
    fileSystem: 'NTFS',
    totalBytes: 120_000_000_000,
    usedBytes: 45_000_000_000,
    codepage: '437',
    physicalObject: 'DISK0 Part1',
  },
  {
    id: 'lv-d',
    letter: 'D:',
    volumeType: 'Basic',
    fileSystem: 'NTFS',
    totalBytes: 500_000_000_000,
    usedBytes: 120_000_000_000,
    codepage: '437',
    physicalObject: 'DISK1 Part1',
  },
];

export const MOCK_PHYSICAL_DISKS: PhysicalDisk[] = [
  {
    id: 'disk0',
    label: 'DISK 0',
    kind: 'SSD',
    partitions: [
      {
        id: 'p0-1',
        label: 'Partition 1',
        type: 'Basic',
        fileSystem: 'NTFS',
        sizeBytes: 120_000_000_000,
        partitionType: 'Primary',
      },
    ],
  },
  {
    id: 'disk1',
    label: 'DISK 1',
    kind: 'HDD',
    partitions: [
      {
        id: 'p1-1',
        label: 'Partition 1',
        type: 'Basic',
        fileSystem: 'NTFS',
        sizeBytes: 500_000_000_000,
        partitionType: 'Primary',
      },
    ],
  },
  {
    id: 'cd0',
    label: 'CDROM 0',
    kind: 'optical',
    partitions: [],
  },
];
