import { Component, OnInit } from '@angular/core';

import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ChartModule
  ],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {

  totalBooks = 12;
  drafts = 4;
  published = 8;

  books: any[] = [];

kpiTable: any[] = [];
  salesData: any;

  ngOnInit(): void {

    console.log(
      'Dashboard loaded',
      localStorage.getItem('access_token')
    );
    this.loadKpis();
    this.loadMockBooks();
    this.loadMockChart();
  }

private loadKpis(): void {

  this.kpiTable = [
    {
      label: 'Total Books',
      value: 12,
      type: 'info'
    },
    {
      label: 'Drafts',
      value: 4,
      type: 'draft'
    },
    {
      label: 'Published',
      value: 8,
      type: 'published'
    }
  ];
}
  private loadMockBooks(): void {

    this.books = [
      {
        title: 'Hiper Memory',
        published: true,
        updatedAt: new Date()
      },
      {
        title: 'Dark Forge Tales',
        published: false,
        updatedAt: new Date()
      },
      {
        title: 'AI Writing Secrets',
        published: true,
        updatedAt: new Date()
      }
    ];
  }

  private loadMockChart(): void {

    this.salesData = {
      labels: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],
      datasets: [
        {
          label: 'Sales',
          data: [3, 5, 2, 8, 10, 6, 12, 15, 9, 11, 14, 18],
          fill: true,
          borderColor: '#d6a06a',
          backgroundColor: 'rgba(214,160,106,0.15)',
          tension: 0.4
        }
      ]
    };
  }
}